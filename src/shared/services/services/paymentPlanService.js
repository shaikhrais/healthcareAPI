
const PaymentPlan = require('../models/PaymentPlan');
const Patient = require('../models/Patient');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Payment Plan Service
 *
 * Calculates payment plans, assesses affordability, and manages installments
 */

/**
 * Payment Plan Calculator Service
 */
class PaymentPlanService {
  /**
   * Calculate payment plan options
   */
  async calculatePaymentPlanOptions(totalAmount, options = {}) {
    try {
      const downPaymentPercent = options.downPaymentPercent || 0;
      const interestRate = options.interestRate || 0; // Annual interest rate
      const minPayment = options.minPayment || 50; // Minimum monthly payment

      const downPayment = Math.round(((totalAmount * downPaymentPercent) / 100) * 100) / 100;
      const financedAmount = totalAmount - downPayment;

      // Generate multiple plan options
      const planOptions = [];
      const termOptions = [3, 6, 12, 18, 24, 36]; // months

      for (const months of termOptions) {
        const monthlyRate = interestRate / 100 / 12;
        let monthlyPayment;
        let totalInterest;

        if (interestRate === 0) {
          // No interest
          monthlyPayment = financedAmount / months;
          totalInterest = 0;
        } else {
          // With interest (standard amortization formula)
          monthlyPayment =
            (financedAmount * (monthlyRate * (1 + monthlyRate) ** months)) /
            ((1 + monthlyRate) ** months - 1);
          totalInterest = monthlyPayment * months - financedAmount;
        }

        monthlyPayment = Math.ceil(monthlyPayment * 100) / 100;
        totalInterest = Math.round(totalInterest * 100) / 100;
        const totalWithInterest = financedAmount + totalInterest;

        // Only include if monthly payment meets minimum
        if (monthlyPayment >= minPayment) {
          planOptions.push({
            termMonths: months,
            downPayment,
            financedAmount,
            monthlyPayment,
            totalInterest,
            totalWithInterest,
            totalCost: downPayment + totalWithInterest,
            interestRate,
            effectiveAPR: this.calculateAPR(financedAmount, monthlyPayment, months),
          });
        }
      }

      logger.info('Payment plan options calculated', {
        totalAmount,
        optionsCount: planOptions.length,
      });

      return {
        totalAmount,
        downPayment,
        financedAmount,
        options: planOptions,
      };
    } catch (error) {
      logger.error('Failed to calculate payment plan options', {
        error: error.message,
        totalAmount,
      });
      throw error;
    }
  }

  /**
   * Calculate APR
   */
  calculateAPR(principal, monthlyPayment, months) {
    const totalPaid = monthlyPayment * months;
    const totalInterest = totalPaid - principal;

    if (totalInterest <= 0) return 0;

    // Simplified APR calculation
    const apr = (totalInterest / principal / (months / 12)) * 100;
    return Math.round(apr * 100) / 100;
  }

  /**
   * Create payment plan with installments
   */
  async createPaymentPlan(data, userId) {
    try {
      // Validate patient
      const patient = await Patient.findById(data.patientId);
      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      // Calculate installments
      const installments = this.generateInstallments(
        data.financedAmount,
        data.numberOfPayments,
        data.paymentFrequency,
        data.firstPaymentDate,
        data.interestRate || 0
      );

      const totalWithInterest = installments.reduce((sum, i) => sum + i.amount, 0);

      const plan = new PaymentPlan({
        patient: data.patientId,
        patientInfo: {
          firstName: data.patientInfo?.firstName || patient.firstName,
          lastName: data.patientInfo?.lastName || patient.lastName,
          email: data.patientInfo?.email || patient.email,
          phone: data.patientInfo?.phone || patient.phone,
        },
        claims: data.claims || [],
        invoices: data.invoices || [],
        financial: {
          totalAmount: data.totalAmount,
          downPayment: data.downPayment || 0,
          downPaymentPaid: false,
          financedAmount: data.financedAmount,
          interestRate: data.interestRate || 0,
          totalInterest: totalWithInterest - data.financedAmount,
          totalWithInterest,
          amountPaid: 0,
          remainingBalance: totalWithInterest,
        },
        terms: {
          numberOfPayments: data.numberOfPayments,
          paymentAmount: data.paymentAmount,
          paymentFrequency: data.paymentFrequency,
          firstPaymentDate: new Date(data.firstPaymentDate),
          finalPaymentDate: installments[installments.length - 1].dueDate,
          autoPayEnabled: data.autoPayEnabled || false,
          lateFeeAmount: data.lateFeeAmount,
          lateFeeDays: data.lateFeeDays || 15,
        },
        installments,
        status: 'draft',
        createdBy: userId,
      });

      await plan.save();

      logger.info('Payment plan created', {
        planId: plan._id,
        planNumber: plan.planNumber,
        patient: data.patientId,
        totalAmount: data.totalAmount,
        numberOfPayments: data.numberOfPayments,
        userId,
      });

      return plan;
    } catch (error) {
      logger.error('Failed to create payment plan', {
        error: error.message,
        data,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate installment schedule
   */
  generateInstallments(
    financedAmount,
    numberOfPayments,
    frequency,
    firstPaymentDate,
    interestRate
  ) {
    const installments = [];
    const monthlyRate = interestRate / 100 / 12;

    let remainingBalance = financedAmount;
    const currentDate = new Date(firstPaymentDate);

    // Calculate base payment (with interest if applicable)
    let basePayment;
    if (interestRate === 0) {
      basePayment = financedAmount / numberOfPayments;
    } else {
      basePayment =
        (financedAmount * (monthlyRate * (1 + monthlyRate) ** numberOfPayments)) /
        ((1 + monthlyRate) ** numberOfPayments - 1);
    }

    basePayment = Math.ceil(basePayment * 100) / 100;

    for (let i = 1; i <= numberOfPayments; i += 1) {
      let interestAmount = 0;
      let principalAmount = basePayment;

      if (interestRate > 0) {
        interestAmount = Math.round(remainingBalance * monthlyRate * 100) / 100;
        principalAmount = basePayment - interestAmount;
      }

      // Last payment adjustment
      if (i === numberOfPayments) {
        principalAmount = remainingBalance;
        basePayment = principalAmount + interestAmount;
      }

      installments.push({
        installmentNumber: i,
        dueDate: new Date(currentDate),
        amount: Math.round(basePayment * 100) / 100,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        status: 'pending',
        paidAmount: 0,
      });

      remainingBalance -= principalAmount;

      // Increment date based on frequency
      switch (frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
      }
    }

    return installments;
  }

  /**
   * Assess affordability
   */
  async assessAffordability(patientId, totalAmount, financialInfo) {
    try {
      const monthlyIncome = financialInfo.monthlyIncome || 0;
      const monthlyExpenses = financialInfo.monthlyExpenses || 0;
      const discretionaryIncome = monthlyIncome - monthlyExpenses;

      // Calculate recommended payment (30% of discretionary income)
      const recommendedPayment = Math.max(
        discretionaryIncome * 0.3,
        50 // Minimum $50
      );

      // Calculate affordability score (0-100)
      let affordabilityScore = 0;

      if (discretionaryIncome > 0) {
        const paymentToIncomeRatio = (recommendedPayment / monthlyIncome) * 100;

        if (paymentToIncomeRatio <= 10) {
          affordabilityScore = 100; // Excellent
        } else if (paymentToIncomeRatio <= 20) {
          affordabilityScore = 80; // Good
        } else if (paymentToIncomeRatio <= 30) {
          affordabilityScore = 60; // Fair
        } else if (paymentToIncomeRatio <= 40) {
          affordabilityScore = 40; // Challenging
        } else {
          affordabilityScore = 20; // Difficult
        }
      }

      // Calculate recommended term
      const recommendedTerm = Math.ceil(totalAmount / recommendedPayment);

      const assessment = {
        monthlyIncome,
        monthlyExpenses,
        discretionaryIncome,
        recommendedPayment: Math.round(recommendedPayment * 100) / 100,
        affordabilityScore,
        assessmentDate: new Date(),
        recommendedTerm,
        assessmentNotes: this.getAffordabilityNotes(affordabilityScore),
      };

      logger.info('Affordability assessed', {
        patientId,
        totalAmount,
        affordabilityScore,
        recommendedPayment: assessment.recommendedPayment,
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to assess affordability', {
        error: error.message,
        patientId,
      });
      throw error;
    }
  }

  /**
   * Get affordability notes
   */
  getAffordabilityNotes(score) {
    if (score >= 80) {
      return 'Patient has excellent affordability. Recommended payment is well within budget.';
    }
    if (score >= 60) {
      return 'Patient has good affordability. Recommended payment is manageable.';
    }
    if (score >= 40) {
      return 'Patient has fair affordability. Payment may require budget adjustments.';
    }
    if (score >= 20) {
      return 'Patient affordability is challenging. Consider longer term or financial assistance.';
    }
    return 'Patient affordability is difficult. Financial assistance programs recommended.';
  }

  /**
   * Record payment
   */
  async recordPayment(planId, installmentNumber, paymentData, userId) {
    try {
      const plan = await PaymentPlan.findById(planId);

      if (!plan) {
        throw new NotFoundError('Payment plan not found');
      }

      plan.recordPayment(installmentNumber, paymentData);
      await plan.save();

      logger.info('Payment recorded', {
        planId,
        planNumber: plan.planNumber,
        installmentNumber,
        amount: paymentData.amount,
        userId,
      });

      return plan;
    } catch (error) {
      logger.error('Failed to record payment', {
        error: error.message,
        planId,
        installmentNumber,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check for overdue payments and apply late fees
   */
  async processOverduePayments() {
    try {
      const overduePlans = await PaymentPlan.getOverduePlans();

      let plansProcessed = 0;
      let lateFeesApplied = 0;
      let defaulted = 0;

      for (const plan of overduePlans) {
        // Calculate and apply late fees
        const lateFees = plan.calculateLateFees();
        lateFeesApplied += lateFees;

        // Check for default (3+ consecutive missed payments)
        const overdueInstallments = plan.getOverdueInstallments();
        plan.defaultTracking.missedPayments = overdueInstallments.length;

        // Count consecutive missed
        let consecutive = 0;
        const sortedInstallments = plan.installments.sort(
          (a, b) => a.installmentNumber - b.installmentNumber
        );
        for (let i = sortedInstallments.length - 1; i >= 0; i -= 1) {
          if (
            sortedInstallments[i].status === 'overdue' ||
            sortedInstallments[i].status === 'missed'
          ) {
            consecutive += 1;
          } else if (sortedInstallments[i].status === 'paid') {
            break;
          }
        }

        plan.defaultTracking.consecutiveMissed = consecutive;

        // Default if 3+ consecutive missed
        if (consecutive >= 3 && plan.status !== 'defaulted') {
          plan.markAsDefaulted('3 or more consecutive missed payments');
          defaulted += 1;
        } else if (overdueInstallments.length > 0) {
          plan.addAlert(
            'overdue_payment',
            `${overdueInstallments.length} payment(s) overdue`,
            consecutive >= 2 ? 'critical' : 'warning'
          );
        }

        await plan.save();
        plansProcessed += 1;
      }

      logger.info('Processed overdue payments', {
        plansProcessed,
        lateFeesApplied,
        defaulted,
      });

      return {
        plansProcessed,
        lateFeesApplied,
        defaulted,
      };
    } catch (error) {
      logger.error('Failed to process overdue payments', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send payment reminders
   */
  async sendPaymentReminders(daysAhead = 7) {
    try {
      const upcomingPlans = await PaymentPlan.getUpcomingPayments(daysAhead);

      const reminders = [];

      for (const plan of upcomingPlans) {
        const nextPayment = plan.getNextDuePayment();

        if (nextPayment) {
          const daysUntilDue = Math.ceil(
            (nextPayment.dueDate - new Date()) / (1000 * 60 * 60 * 24)
          );

          plan.addAlert(
            'upcoming_payment',
            `Payment of $${nextPayment.amount} due in ${daysUntilDue} days`,
            'info'
          );

          await plan.save();

          reminders.push({
            planId: plan._id,
            planNumber: plan.planNumber,
            patientName: `${plan.patientInfo.firstName} ${plan.patientInfo.lastName}`,
            patientEmail: plan.patientInfo.email,
            amount: nextPayment.amount,
            dueDate: nextPayment.dueDate,
            daysUntilDue,
          });
        }
      }

      logger.info('Payment reminders sent', {
        count: reminders.length,
        daysAhead,
      });

      return reminders;
    } catch (error) {
      logger.error('Failed to send payment reminders', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Modify payment plan terms
   */
  async modifyPlanTerms(planId, modifications, userId) {
    try {
      const plan = await PaymentPlan.findById(planId);

      if (!plan) {
        throw new NotFoundError('Payment plan not found');
      }

      if (plan.status === 'completed' || plan.status === 'defaulted') {
        throw new BadRequestError('Cannot modify completed or defaulted plans');
      }

      // Handle different modification types
      if (modifications.newPaymentAmount) {
        plan.modifications.push({
          type: 'payment_amount',
          previousValue: plan.terms.paymentAmount.toString(),
          newValue: modifications.newPaymentAmount.toString(),
          reason: modifications.reason,
          modifiedBy: userId,
        });

        plan.terms.paymentAmount = modifications.newPaymentAmount;

        // Recalculate remaining installments
        const unpaidInstallments = plan.installments.filter((i) => i.status === 'pending');
        const { remainingBalance } = plan.financial;
        const newPaymentPerInstallment = remainingBalance / unpaidInstallments.length;

        unpaidInstallments.forEach((installment) => {
          installment.amount = Math.round(newPaymentPerInstallment * 100) / 100;
        });
      }

      if (modifications.extendTerm) {
        const additionalMonths = modifications.extendTerm;
        plan.modifications.push({
          type: 'terms_extended',
          previousValue: plan.terms.numberOfPayments.toString(),
          newValue: (plan.terms.numberOfPayments + additionalMonths).toString(),
          reason: modifications.reason,
          modifiedBy: userId,
        });

        // Add additional installments
        const lastInstallment = plan.installments[plan.installments.length - 1];
        const newPaymentAmount = plan.financial.remainingBalance / additionalMonths;

        for (let i = 1; i <= additionalMonths; i += 1) {
          const newDueDate = new Date(lastInstallment.dueDate);
          newDueDate.setMonth(newDueDate.getMonth() + i);

          plan.installments.push({
            installmentNumber: plan.installments.length + 1,
            dueDate: newDueDate,
            amount: Math.round(newPaymentAmount * 100) / 100,
            principalAmount: Math.round(newPaymentAmount * 100) / 100,
            interestAmount: 0,
            status: 'pending',
            paidAmount: 0,
          });
        }

        plan.terms.numberOfPayments += additionalMonths;
        plan.terms.finalPaymentDate = plan.installments[plan.installments.length - 1].dueDate;
      }

      await plan.save();

      logger.info('Payment plan modified', {
        planId,
        planNumber: plan.planNumber,
        modificationType: Object.keys(modifications),
        userId,
      });

      return plan;
    } catch (error) {
      logger.error('Failed to modify payment plan', {
        error: error.message,
        planId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get payment plan dashboard
   */
  async getPaymentPlanDashboard() {
    try {
      const [activeCount, totalActive, overdueCount, upcomingCount, stats] = await Promise.all([
        PaymentPlan.countDocuments({ status: 'active' }),
        PaymentPlan.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              totalRemaining: { $sum: '$financial.remainingBalance' },
              totalFinanced: { $sum: '$financial.financedAmount' },
            },
          },
        ]),
        PaymentPlan.getOverduePlans().then((plans) => plans.length),
        PaymentPlan.getUpcomingPayments(7).then((plans) => plans.length),
        PaymentPlan.getStatistics(),
      ]);

      const activeTotals = totalActive[0] || { totalRemaining: 0, totalFinanced: 0 };

      return {
        activePlans: activeCount,
        totalRemainingBalance: activeTotals.totalRemaining,
        totalFinanced: activeTotals.totalFinanced,
        overduePlans: overdueCount,
        upcomingPayments: upcomingCount,
        statistics: stats,
      };
    } catch (error) {
      logger.error('Failed to get payment plan dashboard', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const paymentPlanService = new PaymentPlanService();

module.exports = {
  PaymentPlanService,
  paymentPlanService,
};
