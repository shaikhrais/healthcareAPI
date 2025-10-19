
const Payment = require('../models/Payment');
// Initialize Stripe only if API key is provided
const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')
    ? require('stripe')(process.env.STRIPE_SECRET_KEY)
    : null;
class PaymentService {
  /**
   * Create a Stripe payment intent
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!stripe) {
      console.warn('Stripe not configured. Returning mock payment intent for development.');
      return {
        id: 'pi_mock_' + Date.now(),
        amount: Math.round(amount * 100),
        currency,
        status: 'requires_payment_method',
        client_secret: 'pi_mock_secret_' + Date.now(),
        metadata,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Process a payment
   */
  async processPayment(paymentData) {
    const { patientId, appointmentId, amount, paymentMethod, processedBy, description } =
      paymentData;

    const paymentRecord = {
      patientId,
      appointmentId,
      amount,
      paymentMethod,
      processedBy,
      description,
      status: 'pending',
    };

    try {
      // Handle different payment methods
      if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        // Create Stripe payment intent
        const paymentIntent = await this.createPaymentIntent(amount, 'usd', {
          patientId: patientId.toString(),
          appointmentId: appointmentId?.toString(),
        });

        paymentRecord.stripePaymentIntentId = paymentIntent.id;
        paymentRecord.status = 'pending'; // Will be updated when payment is confirmed
      } else if (
        paymentMethod === 'cash' ||
        paymentMethod === 'check' ||
        paymentMethod === 'e_transfer'
      ) {
        // Direct payment methods - mark as completed immediately
        paymentRecord.status = 'completed';
        paymentRecord.transactionId = `${paymentMethod.toUpperCase()}-${Date.now()}`;
      }

      const payment = await Payment.create(paymentRecord);
      return payment;
    } catch (error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Confirm a Stripe payment
   */
  async confirmStripePayment(paymentIntentId, paymentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
          throw new Error('Payment record not found');
        }

        payment.status = 'completed';
        payment.stripeChargeId = paymentIntent.charges.data[0]?.id;
        payment.cardLast4 = paymentIntent.charges.data[0]?.payment_method_details?.card?.last4;
        payment.cardBrand = paymentIntent.charges.data[0]?.payment_method_details?.card?.brand;
        payment.receiptUrl = paymentIntent.charges.data[0]?.receipt_url;
        payment.transactionId = paymentIntent.id;

        await payment.save();
        return payment;
      }
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    } catch (error) {
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Process a refund
   */
  async processRefund(paymentId, amount, reason) {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      let refund;

      if (payment.stripeChargeId) {
        // Refund via Stripe
        refund = await stripe.refunds.create({
          charge: payment.stripeChargeId,
          amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
          reason: reason || 'requested_by_customer',
        });

        payment.refundedAmount = (payment.refundedAmount || 0) + (amount || payment.amount);
      } else {
        // Manual refund (cash, check, etc.)
        payment.refundedAmount = (payment.refundedAmount || 0) + (amount || payment.amount);
      }

      payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partial';
      payment.refundReason = reason;

      await payment.save();
      return payment;
    } catch (error) {
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Generate invoice for payment
   */
  async generateInvoice(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('patientId', 'firstName lastName email')
        .populate('appointmentId', 'date time service')
        .populate('processedBy', 'firstName lastName');

      if (!payment) {
        throw new Error('Payment not found');
      }

      const invoice = {
        receiptNumber: payment.receiptNumber,
        date: payment.createdAt,
        patient: {
          name: `${payment.patientId.firstName} ${payment.patientId.lastName}`,
          email: payment.patientId.email,
        },
        items: [
          {
            description: payment.description || 'Healthcare Services',
            amount: payment.amount,
          },
        ],
        total: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        processedBy: `${payment.processedBy.firstName} ${payment.processedBy.lastName}`,
      };

      return invoice;
    } catch (error) {
      throw new Error(`Invoice generation failed: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(startDate, endDate) {
    try {
      const stats = await Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            avgTransaction: { $avg: '$amount' },
            byPaymentMethod: {
              $push: {
                method: '$paymentMethod',
                amount: '$amount',
              },
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalRevenue: 0,
          totalTransactions: 0,
          avgTransaction: 0,
          byPaymentMethod: [],
        }
      );
    } catch (error) {
      throw new Error(`Stats calculation failed: ${error.message}`);
    }
  }

  /**
   * Get outstanding balance for a patient
   */
  async getPatientBalance(patientId) {
    try {
      // This would typically involve fetching appointment charges and subtracting payments
      const totalPaid = await Payment.getTotalPaid(patientId);

      // TODO: Implement appointment charges system
      // For now, return paid amount
      return {
        totalPaid,
        outstanding: 0, // Would calculate: totalCharges - totalPaid
      };
    } catch (error) {
      throw new Error(`Balance calculation failed: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();
