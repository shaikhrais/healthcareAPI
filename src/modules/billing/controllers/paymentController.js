const Payment = require('../models/Payment');
const paymentService = require('../services/payment.service');
const { canAccessBilling } = require('../middleware/rolePermissions');

exports.processPayment = async (req, res) => {
  try {
    const { patientId, appointmentId, amount, paymentMethod, description } = req.body;
    if (!patientId || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const payment = await paymentService.processPayment({
      patientId,
      appointmentId,
      amount,
      paymentMethod,
      processedBy: req.user._id,
      description,
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;
    if (!paymentIntentId || !paymentId) {
      return res.status(400).json({ error: 'Missing payment intent ID or payment ID' });
    }
    const payment = await paymentService.confirmStripePayment(paymentIntentId, paymentId);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const payment = await paymentService.processRefund(req.params.id, amount, reason);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patientId', 'firstName lastName')
      .populate('appointmentId', 'date time')
      .populate('processedBy', 'firstName lastName');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPatientHistory = async (req, res) => {
  try {
    if (!canAccessBilling(req.user)) {
      return res.status(403).json({ error: 'No billing access' });
    }
    const limit = parseInt(req.query.limit, 10) || 10;
    const payments = await Payment.getPatientHistory(req.params.patientId, limit);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPatientBalance = async (req, res) => {
  try {
    const balance = await paymentService.getPatientBalance(req.params.patientId);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const invoice = await paymentService.generateInvoice(req.params.id);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDailyStats = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const stats = await Payment.getDailyRevenue(date);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRangeStats = async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate || new Date().setDate(1));
    const endDate = new Date(req.query.endDate || new Date());
    const stats = await paymentService.getPaymentStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }
    const payments = await Payment.find(filter)
      .populate('patientId', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Payment.countDocuments(filter);
    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
