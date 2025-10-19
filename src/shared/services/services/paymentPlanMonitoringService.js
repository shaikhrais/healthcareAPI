
const PaymentPlan = require('../models/PaymentPlan');
const Patient = require('../models/Patient');
const paymentPlanService = require('./paymentPlanService');
/**
 * Payment Plan Monitoring Service
 *
 * Automated monitoring and processing for payment plans:
 * - Process overdue payments and apply late fees
 * - Send payment reminders
 * - Detect and mark defaulted plans
 * - Process auto-payments (when enabled)
 * - Generate alerts for upcoming payments
 */

class PaymentPlanMonitoringService {
  constructor() {
    this.monitoringInterval = null;
    this.reminderInterval = null;
    this.autoPaymentInterval = null;
  }

  /**
   * Start all monitoring tasks
   */
  start() {
    console.log('Starting Payment Plan Monitoring Service...');

    // Process overdue payments every hour
    this.monitoringInterval = setInterval(
      () => {
        this.processOverduePayments();
      },
      60 * 60 * 1000
    ); // 1 hour

    // Send payment reminders daily at 9 AM
    this.scheduleReminderTask();

    // Process auto-payments daily at 2 AM
    this.scheduleAutoPaymentTask();

    // Run initial checks
    this.processOverduePayments();
    this.sendPaymentReminders();

    console.log('Payment Plan Monitoring Service started successfully');
  }

  /**
   * Stop all monitoring tasks
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
    if (this.autoPaymentInterval) {
      clearInterval(this.autoPaymentInterval);
    }

    console.log('Payment Plan Monitoring Service stopped');
  }

  /**
   * Schedule reminder task for 9 AM daily
   */
  scheduleReminderTask() {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const timeout = next.getTime() - now.getTime();

      setTimeout(() => {
        this.sendPaymentReminders();
        this.reminderInterval = setInterval(
          () => {
            this.sendPaymentReminders();
          },
          24 * 60 * 60 * 1000
        ); // Every 24 hours
      }, timeout);
    };

    scheduleNext();
  }

  /**
   * Schedule auto-payment task for 2 AM daily
   */
  scheduleAutoPaymentTask() {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(2, 0, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const timeout = next.getTime() - now.getTime();

      setTimeout(() => {
        this.processAutoPayments();
        this.autoPaymentInterval = setInterval(
          () => {
            this.processAutoPayments();
          },
          24 * 60 * 60 * 1000
        ); // Every 24 hours
      }, timeout);
    };

    scheduleNext();
  }

  /**
   * Process overdue payments
   * - Apply late fees
   * - Count missed payments
   * - Mark plans as defaulted
   */
  async processOverduePayments() {
    try {
      console.log('Processing overdue payments...');

      const overduePlans = await PaymentPlan.getOverduePlans();
      let processedCount = 0;
      let defaultedCount = 0;

      for (const plan of overduePlans) {
        try {
          // Calculate and apply late fees
          const lateFees = plan.calculateLateFees();
          if (lateFees > 0) {
            console.log(`Applied $${lateFees} in late fees to plan ${plan.planNumber}`);
          }

          // Check for default condition (3+ consecutive missed payments)
          const overdueInstallments = plan.getOverdueInstallments();
          let consecutiveMissed = 0;

          // Count consecutive missed payments
          for (const installment of plan.installments.sort(
            (a, b) => a.installmentNumber - b.installmentNumber
          )) {
            if (installment.status === 'overdue' || installment.status === 'missed') {
              consecutiveMissed += 1;

              // Mark as missed if more than 30 days overdue
              const daysOverdue = Math.floor(
                (new Date() - installment.dueDate) / (1000 * 60 * 60 * 24)
              );
              if (daysOverdue > 30 && installment.status !== 'missed') {
                installment.status = 'missed';
                plan.defaultTracking.missedPayments += 1;
              }
            } else if (installment.status === 'paid') {
              consecutiveMissed = 0;
            }
          }

          plan.defaultTracking.consecutiveMissed = consecutiveMissed;

          // Default plan if 3+ consecutive missed
          if (consecutiveMissed >= 3 && plan.status !== 'defaulted') {
            plan.markAsDefaulted(`${consecutiveMissed} consecutive missed payments`);
            defaultedCount += 1;

            console.log(
              `Plan ${plan.planNumber} marked as defaulted (${consecutiveMissed} consecutive missed)`
            );
          }

          // Create alerts for overdue payments
          if (plan.status === 'active') {
            const totalOverdue = overdueInstallments.reduce(
              (sum, inst) => sum + (inst.amount - inst.paidAmount),
              0
            );

            if (totalOverdue > 0) {
              const severity = consecutiveMissed >= 2 ? 'critical' : 'warning';
              plan.addAlert(
                'overdue_payment',
                `${overdueInstallments.length} payment(s) overdue totaling $${totalOverdue.toFixed(2)}`,
                severity
              );
            }
          }

          await plan.save();
          processedCount += 1;
        } catch (error) {
          console.error(`Error processing plan ${plan.planNumber}:`, error);
        }
      }

      console.log(
        `Processed ${processedCount} overdue plans, ${defaultedCount} marked as defaulted`
      );
    } catch (error) {
      console.error('Error processing overdue payments:', error);
    }
  }

  /**
   * Send payment reminders
   * - Upcoming payments (3 days before due)
   * - Overdue payment reminders
   */
  async sendPaymentReminders() {
    try {
      console.log('Sending payment reminders...');

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Get plans with upcoming payments (3 days ahead)
      const upcomingPlans = await PaymentPlan.getUpcomingPayments(3);
      let remindersSent = 0;

      for (const plan of upcomingPlans) {
        try {
          const nextPayment = plan.getNextDuePayment();

          if (nextPayment && nextPayment.dueDate <= threeDaysFromNow) {
            const daysUntilDue = Math.ceil((nextPayment.dueDate - now) / (1000 * 60 * 60 * 24));

            // Create alert for upcoming payment
            plan.addAlert(
              'upcoming_payment',
              `Payment of $${nextPayment.amount.toFixed(2)} due in ${daysUntilDue} day(s)`,
              'info'
            );

            await plan.save();
            remindersSent += 1;

            console.log(
              `Sent reminder for plan ${plan.planNumber}: Payment due in ${daysUntilDue} days`
            );

            // TODO: Send email/SMS notification
            // await this.sendReminderNotification(plan, nextPayment, daysUntilDue);
          }
        } catch (error) {
          console.error(`Error sending reminder for plan ${plan._id}:`, error);
        }
      }

      // Send overdue reminders
      const overduePlans = await PaymentPlan.getOverduePlans();
      let overdueRemindersSent = 0;

      for (const plan of overduePlans) {
        try {
          const overdueInstallments = plan.getOverdueInstallments();
          const totalOverdue = overdueInstallments.reduce(
            (sum, inst) => sum + (inst.amount - inst.paidAmount),
            0
          );

          // Create alert
          plan.addAlert(
            'overdue_payment',
            `${overdueInstallments.length} payment(s) overdue totaling $${totalOverdue.toFixed(2)}`,
            'warning'
          );

          await plan.save();
          overdueRemindersSent += 1;

          console.log(`Sent overdue reminder for plan ${plan.planNumber}`);

          // TODO: Send email/SMS notification
          // await this.sendOverdueNotification(plan, overdueInstallments, totalOverdue);
        } catch (error) {
          console.error(`Error sending overdue reminder for plan ${plan._id}:`, error);
        }
      }

      console.log(
        `Sent ${remindersSent} upcoming payment reminders and ${overdueRemindersSent} overdue reminders`
      );
    } catch (error) {
      console.error('Error sending payment reminders:', error);
    }
  }

  /**
   * Process auto-payments
   * - Process payments for plans with auto-pay enabled
   * - Charge payment method on due date
   */
  async processAutoPayments() {
    try {
      console.log('Processing auto-payments...');

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Find plans with auto-pay enabled and payment due today/tomorrow
      const plans = await PaymentPlan.find({
        status: 'active',
        'terms.autoPayEnabled': true,
        installments: {
          $elemMatch: {
            status: 'pending',
            dueDate: { $gte: now, $lte: tomorrow },
          },
        },
      }).populate('patient', 'firstName lastName email phone');

      let successCount = 0;
      let failureCount = 0;

      for (const plan of plans) {
        try {
          // Find next due payment
          const nextPayment = plan.installments.find(
            (inst) => inst.status === 'pending' && inst.dueDate >= now && inst.dueDate <= tomorrow
          );

          if (!nextPayment) continue;

          // Check if payment method is configured
          if (!plan.paymentMethod || !plan.paymentMethod.type) {
            console.log(`Plan ${plan.planNumber}: No payment method configured for auto-pay`);

            plan.addAlert(
              'default_warning',
              'Auto-payment failed: No payment method configured',
              'warning'
            );
            await plan.save();
            failureCount += 1;
            continue;
          }

          console.log(
            `Processing auto-payment for plan ${plan.planNumber}: $${nextPayment.amount}`
          );

          // TODO: Integrate with payment processor (Stripe, Square, etc.)
          // const paymentResult = await this.processPaymentTransaction({
          //   amount: nextPayment.amount,
          //   paymentMethod: plan.paymentMethod,
          //   customerId: plan.patient._id,
          //   description: `Payment plan ${plan.planNumber} - Installment ${nextPayment.installmentNumber}`
          // });

          // For now, simulate successful payment
          const paymentResult = {
            success: true,
            transactionId: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            amount: nextPayment.amount,
            processedAt: new Date(),
          };

          if (paymentResult.success) {
            // Record payment
            const paymentData = {
              amount: paymentResult.amount,
              method: plan.paymentMethod.type,
              transactionId: paymentResult.transactionId,
              date: paymentResult.processedAt,
            };

            plan.recordPayment(nextPayment.installmentNumber, paymentData);

            // Add success alert
            plan.addAlert(
              'upcoming_payment',
              `Auto-payment of $${nextPayment.amount.toFixed(2)} processed successfully`,
              'info'
            );

            await plan.save();
            successCount += 1;

            console.log(`Auto-payment successful for plan ${plan.planNumber}`);

            // TODO: Send confirmation notification
            // await this.sendPaymentConfirmation(plan, paymentResult);
          } else {
            // Payment failed
            console.log(`Auto-payment failed for plan ${plan.planNumber}: ${paymentResult.error}`);

            plan.addAlert(
              'default_warning',
              `Auto-payment failed: ${paymentResult.error || 'Payment processing error'}`,
              'critical'
            );

            await plan.save();
            failureCount += 1;

            // TODO: Send failure notification
            // await this.sendPaymentFailureNotification(plan, paymentResult);
          }
        } catch (error) {
          console.error(`Error processing auto-payment for plan ${plan._id}:`, error);
          failureCount += 1;
        }
      }

      console.log(
        `Processed ${successCount + failureCount} auto-payments: ${successCount} successful, ${failureCount} failed`
      );
    } catch (error) {
      console.error('Error processing auto-payments:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      running: !!this.monitoringInterval,
      intervals: {
        monitoring: !!this.monitoringInterval,
        reminders: !!this.reminderInterval,
        autoPayments: !!this.autoPaymentInterval,
      },
    };
  }

  /**
   * Manual trigger for overdue processing
   */
  async manualProcessOverdue() {
    return await this.processOverduePayments();
  }

  /**
   * Manual trigger for payment reminders
   */
  async manualSendReminders() {
    return await this.sendPaymentReminders();
  }

  /**
   * Manual trigger for auto-payments
   */
  async manualProcessAutoPayments() {
    return await this.processAutoPayments();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const now = new Date();

      const [
        totalActive,
        totalOverdue,
        upcomingPayments,
        autoPayEnabled,
        defaultedPlans,
        recentPayments,
      ] = await Promise.all([
        PaymentPlan.countDocuments({ status: 'active' }),

        PaymentPlan.countDocuments({
          status: 'active',
          installments: {
            $elemMatch: {
              status: { $in: ['pending', 'partial'] },
              dueDate: { $lt: now },
            },
          },
        }),

        PaymentPlan.getUpcomingPayments(7),

        PaymentPlan.countDocuments({
          status: 'active',
          'terms.autoPayEnabled': true,
        }),

        PaymentPlan.countDocuments({ status: 'defaulted' }),

        PaymentPlan.aggregate([
          { $unwind: '$installments' },
          {
            $match: {
              'installments.status': 'paid',
              'installments.paidDate': { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: { _id: null, total: { $sum: '$installments.paidAmount' }, count: { $sum: 1 } },
          },
        ]),
      ]);

      const recentPaymentStats = recentPayments[0] || { total: 0, count: 0 };

      return {
        plans: {
          totalActive,
          totalOverdue,
          defaultedPlans,
          autoPayEnabled,
        },
        payments: {
          upcomingCount: upcomingPayments.length,
          recentPaymentsLast30Days: recentPaymentStats.count,
          recentPaymentsTotalLast30Days: recentPaymentStats.total,
        },
        monitoring: this.getStatus(),
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get plans requiring attention
   */
  async getPlansRequiringAttention() {
    try {
      const now = new Date();

      // Get plans with critical issues
      const [overduePlans, defaultWarningPlans, failedAutoPayPlans] = await Promise.all([
        // Plans with 2+ overdue payments
        PaymentPlan.find({
          status: 'active',
          'defaultTracking.consecutiveMissed': { $gte: 2 },
        })
          .populate('patient', 'firstName lastName email phone')
          .sort({ 'defaultTracking.consecutiveMissed': -1 })
          .limit(20),

        // Plans with unacknowledged critical alerts
        PaymentPlan.find({
          status: 'active',
          alerts: {
            $elemMatch: {
              severity: 'critical',
              acknowledged: false,
            },
          },
        })
          .populate('patient', 'firstName lastName email phone')
          .limit(20),

        // Plans with failed auto-payments
        PaymentPlan.find({
          status: 'active',
          'terms.autoPayEnabled': true,
          alerts: {
            $elemMatch: {
              type: 'default_warning',
              message: { $regex: 'Auto-payment failed' },
              createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              acknowledged: false,
            },
          },
        })
          .populate('patient', 'firstName lastName email phone')
          .limit(20),
      ]);

      return {
        overduePlans: overduePlans.map((plan) => ({
          ...plan.toObject(),
          overdueInstallments: plan.getOverdueInstallments(),
          summary: plan.getPaymentSummary(),
        })),
        defaultWarningPlans: defaultWarningPlans.map((plan) => ({
          ...plan.toObject(),
          summary: plan.getPaymentSummary(),
        })),
        failedAutoPayPlans: failedAutoPayPlans.map((plan) => ({
          ...plan.toObject(),
          summary: plan.getPaymentSummary(),
        })),
      };
    } catch (error) {
      console.error('Error getting plans requiring attention:', error);
      throw error;
    }
  }
}

// Create singleton instance
const monitoringService = new PaymentPlanMonitoringService();

module.exports = monitoringService;
