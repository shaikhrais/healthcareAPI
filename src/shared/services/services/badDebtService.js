
const BadDebt = require('../models/BadDebt');
const Patient = require('../models/Patient');
const PaymentPlan = require('../models/PaymentPlan');
/**
 * Bad Debt Tracking Service
 *
 * Manages bad debt identification, tracking, collection efforts,
 * and write-off processing for healthcare billing
 */

class BadDebtService {
  /**
   * Create bad debt record
   */
  async createBadDebt(badDebtData, createdBy) {
    try {
      // Fetch patient information
      const patient = await Patient.findById(badDebtData.patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Build bad debt record
      const badDebt = new BadDebt({
        patient: patient._id,
        patientInfo: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          ssn: badDebtData.ssnLast4, // Last 4 digits only
        },

        claims: badDebtData.claims || [],
        invoices: badDebtData.invoices || [],
        paymentPlans: badDebtData.paymentPlans || [],

        financial: {
          originalAmount: badDebtData.originalAmount,
          currentBalance: badDebtData.originalAmount,
          firstBillingDate: badDebtData.firstBillingDate || new Date(),
          lastBillingDate: badDebtData.lastBillingDate,
        },

        classification: {
          type: badDebtData.classificationType,
          reason: badDebtData.reason,
          reasonDetails: badDebtData.reasonDetails,
        },

        assignedTo: badDebtData.assignedTo,
        assignedDate: badDebtData.assignedTo ? new Date() : undefined,

        priority: this.calculatePriority(badDebtData.originalAmount, badDebtData.firstBillingDate),

        createdBy,
        notes: badDebtData.notes,
      });

      // Set initial next action date (7 days from now)
      badDebt.nextActionDate = new Date();
      badDebt.nextActionDate.setDate(badDebt.nextActionDate.getDate() + 7);
      badDebt.nextActionType = 'initial_contact';

      // Add high value alert if applicable
      if (badDebtData.originalAmount >= 5000) {
        badDebt.addAlert(
          'high_value',
          `High value account: $${badDebtData.originalAmount.toFixed(2)}`,
          'warning'
        );
      }

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error creating bad debt:', error);
      throw error;
    }
  }

  /**
   * Identify bad debt from defaulted payment plan
   */
  async identifyFromPaymentPlan(paymentPlanId, createdBy) {
    try {
      const paymentPlan = await PaymentPlan.findById(paymentPlanId).populate(
        'patient',
        'firstName lastName email phone dateOfBirth'
      );

      if (!paymentPlan) {
        throw new Error('Payment plan not found');
      }

      if (paymentPlan.status !== 'defaulted') {
        throw new Error('Payment plan is not defaulted');
      }

      // Check if bad debt already exists for this plan
      const existing = await BadDebt.findOne({
        'paymentPlans.planId': paymentPlanId,
      });

      if (existing) {
        throw new Error('Bad debt already exists for this payment plan');
      }

      // Create bad debt record
      const badDebtData = {
        patientId: paymentPlan.patient._id,
        originalAmount: paymentPlan.financial.remainingBalance,
        firstBillingDate: paymentPlan.terms.firstPaymentDate,
        lastBillingDate: paymentPlan.defaultTracking.defaultDate,
        classificationType: 'payment_plan_default',
        reason: 'unwilling_to_pay',
        reasonDetails: paymentPlan.defaultTracking.defaultReason,
        paymentPlans: [
          {
            planId: paymentPlan._id,
            planNumber: paymentPlan.planNumber,
            defaultDate: paymentPlan.defaultTracking.defaultDate,
            amountDue: paymentPlan.financial.remainingBalance,
          },
        ],
        notes: `Defaulted payment plan: ${paymentPlan.planNumber}`,
      };

      const badDebt = await this.createBadDebt(badDebtData, createdBy);

      return badDebt;
    } catch (error) {
      console.error('Error identifying bad debt from payment plan:', error);
      throw error;
    }
  }

  /**
   * Calculate priority based on amount and age
   */
  calculatePriority(amount, firstBillingDate) {
    const daysPastDue = Math.floor((new Date() - firstBillingDate) / (1000 * 60 * 60 * 24));

    // Critical: High amount (>= $10,000) or very old (>= 180 days)
    if (amount >= 10000 || daysPastDue >= 180) {
      return 'critical';
    }

    // High: Medium-high amount (>= $5,000) or old (>= 90 days)
    if (amount >= 5000 || daysPastDue >= 90) {
      return 'high';
    }

    // Medium: Medium amount (>= $1,000) or moderate age (>= 60 days)
    if (amount >= 1000 || daysPastDue >= 60) {
      return 'medium';
    }

    // Low: Small amount or recent
    return 'low';
  }

  /**
   * Add collection effort
   */
  async addCollectionEffort(badDebtId, effortData, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      // Get user name
      const User = require('../models/User');
      const user = await User.findById(userId);

      effortData.performedBy = userId;
      effortData.performedByName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

      badDebt.addCollectionEffort(effortData);

      // Update status if needed
      if (badDebt.status === 'identified') {
        badDebt.status = 'in_collection';
      }

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error adding collection effort:', error);
      throw error;
    }
  }

  /**
   * Record payment
   */
  async recordPayment(badDebtId, amount, paymentDate, notes, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      if (amount > badDebt.financial.currentBalance) {
        throw new Error('Payment amount exceeds current balance');
      }

      // Record payment
      badDebt.recordPayment(amount, paymentDate || new Date());

      // Add collection effort for payment received
      await this.addCollectionEffort(
        badDebtId,
        {
          type: 'payment_received',
          method: 'internal',
          outcome: 'payment_received',
          notes,
          amountCollected: amount,
          date: paymentDate || new Date(),
        },
        userId
      );

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Send to external collection agency
   */
  async sendToExternalCollection(badDebtId, agencyData, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (badDebt.status === 'external_collection') {
        throw new Error('Already sent to external collection');
      }

      if (badDebt.compliance.ceaseAndDesistReceived) {
        throw new Error('Cannot send to collection: Cease and desist received');
      }

      badDebt.sendToExternalCollection(agencyData);
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error sending to external collection:', error);
      throw error;
    }
  }

  /**
   * Return from external collection
   */
  async returnFromExternalCollection(badDebtId, returnReason, collectedAmount, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (badDebt.status !== 'external_collection') {
        throw new Error('Not currently in external collection');
      }

      // Update external collection info
      badDebt.externalCollection.returnedDate = new Date();
      badDebt.externalCollection.returnedReason = returnReason;
      badDebt.externalCollection.status = 'returned';

      if (collectedAmount && collectedAmount > 0) {
        badDebt.externalCollection.collectedAmount =
          (badDebt.externalCollection.collectedAmount || 0) + collectedAmount;

        // Calculate commission
        const commission = collectedAmount * (badDebt.externalCollection.commissionRate / 100);
        badDebt.externalCollection.commissionPaid =
          (badDebt.externalCollection.commissionPaid || 0) + commission;

        // Record payment
        badDebt.recordPayment(collectedAmount, new Date());
      }

      // Update status
      if (badDebt.financial.currentBalance > 0) {
        badDebt.status = 'in_collection';
      }

      badDebt.lastUpdatedBy = userId;
      badDebt.addAlert(
        'collection_opportunity',
        `Returned from ${badDebt.externalCollection.agencyName}`,
        'info'
      );

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error returning from external collection:', error);
      throw error;
    }
  }

  /**
   * Initiate legal action
   */
  async initiateLegalAction(badDebtId, legalData, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (badDebt.compliance.ceaseAndDesistReceived) {
        throw new Error('Cannot initiate legal action: Cease and desist received');
      }

      if (badDebt.bankruptcy.filed) {
        throw new Error('Cannot initiate legal action: Bankruptcy filed');
      }

      badDebt.initiateLegalAction(legalData);
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error initiating legal action:', error);
      throw error;
    }
  }

  /**
   * Offer settlement
   */
  async offerSettlement(badDebtId, offerAmount, terms, expiryDays, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (offerAmount >= badDebt.financial.currentBalance) {
        throw new Error('Settlement offer must be less than current balance');
      }

      if (offerAmount <= 0) {
        throw new Error('Settlement offer must be greater than 0');
      }

      badDebt.offerSettlement(offerAmount, terms, expiryDays);
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error offering settlement:', error);
      throw error;
    }
  }

  /**
   * Accept settlement
   */
  async acceptSettlement(badDebtId, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.acceptSettlement();
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error accepting settlement:', error);
      throw error;
    }
  }

  /**
   * Record settlement payment
   */
  async recordSettlementPayment(badDebtId, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (!badDebt.settlement.accepted) {
        throw new Error('Settlement not accepted');
      }

      if (badDebt.settlement.paymentReceived) {
        throw new Error('Settlement payment already received');
      }

      const settlementAmount = badDebt.settlement.offerAmount;
      const writeOffAmount = badDebt.financial.currentBalance - settlementAmount;

      // Record settlement payment
      badDebt.recordPayment(settlementAmount, new Date());

      // Write off remaining balance
      badDebt.writeOff('settled', `Settlement for $${settlementAmount.toFixed(2)}`, userId);

      badDebt.settlement.paymentReceived = true;
      badDebt.settlement.paymentReceivedDate = new Date();
      badDebt.settlement.settledAmount = settlementAmount;
      badDebt.settlement.settledDate = new Date();

      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error recording settlement payment:', error);
      throw error;
    }
  }

  /**
   * Write off bad debt
   */
  async writeOff(badDebtId, reason, reasonDetails, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      if (badDebt.status === 'written_off') {
        throw new Error('Already written off');
      }

      if (badDebt.financial.currentBalance <= 0) {
        throw new Error('No balance to write off');
      }

      badDebt.writeOff(reason, reasonDetails, userId);
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error writing off bad debt:', error);
      throw error;
    }
  }

  /**
   * Mark patient as deceased
   */
  async markAsDeceased(badDebtId, dateOfDeath, deathCertificateReceived, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.markAsDeceased(dateOfDeath, deathCertificateReceived);
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error marking patient as deceased:', error);
      throw error;
    }
  }

  /**
   * File bankruptcy
   */
  async fileBankruptcy(badDebtId, bankruptcyData, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.fileBankruptcy(bankruptcyData);
      badDebt.lastUpdatedBy = userId;

      // Stop all collection efforts
      badDebt.nextActionDate = null;
      badDebt.nextActionType = null;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error filing bankruptcy:', error);
      throw error;
    }
  }

  /**
   * Update patient dispute
   */
  async updatePatientDispute(badDebtId, disputed, disputeReason, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.compliance.patientDisputedDebt = disputed;

      if (disputed) {
        badDebt.compliance.disputeDate = new Date();
        badDebt.compliance.disputeReason = disputeReason;
        badDebt.compliance.disputeResolved = false;
        badDebt.addAlert('dispute_filed', 'Patient disputed debt', 'warning');

        // Per FDCPA, must validate debt if disputed
        badDebt.compliance.validationLetterSent = false;
      } else if (badDebt.compliance.disputeDate) {
        badDebt.compliance.disputeResolved = true;
        badDebt.compliance.disputeResolutionDate = new Date();
      }

      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error updating patient dispute:', error);
      throw error;
    }
  }

  /**
   * Record cease and desist
   */
  async recordCeaseAndDesist(badDebtId, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.compliance.ceaseAndDesistReceived = true;
      badDebt.compliance.ceaseAndDesistDate = new Date();
      badDebt.compliance.fdcpaCompliant = true;

      badDebt.addAlert(
        'compliance_issue',
        'Cease and desist received - Stop all contact',
        'critical'
      );

      // Clear next action
      badDebt.nextActionDate = null;
      badDebt.nextActionType = null;

      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error recording cease and desist:', error);
      throw error;
    }
  }

  /**
   * Assign bad debt to user
   */
  async assignBadDebt(badDebtId, assignToUserId, userId) {
    try {
      const badDebt = await BadDebt.findById(badDebtId);

      if (!badDebt) {
        throw new Error('Bad debt not found');
      }

      badDebt.assignedTo = assignToUserId;
      badDebt.assignedDate = new Date();
      badDebt.lastUpdatedBy = userId;

      await badDebt.save();

      return badDebt;
    } catch (error) {
      console.error('Error assigning bad debt:', error);
      throw error;
    }
  }

  /**
   * Bulk assign bad debts
   */
  async bulkAssign(badDebtIds, assignToUserId, userId) {
    try {
      const result = await BadDebt.updateMany(
        { _id: { $in: badDebtIds } },
        {
          $set: {
            assignedTo: assignToUserId,
            assignedDate: new Date(),
            lastUpdatedBy: userId,
          },
        }
      );

      return result;
    } catch (error) {
      console.error('Error bulk assigning bad debts:', error);
      throw error;
    }
  }

  /**
   * Get aging report
   */
  async getAgingReport() {
    try {
      const agingBuckets = ['0-30', '31-60', '61-90', '91-120', '121-180', '181-365', '365+'];

      const report = {};

      for (const bucket of agingBuckets) {
        const debts = await BadDebt.getByAgingBucket(bucket, 'in_collection');

        const totalAmount = debts.reduce((sum, debt) => sum + debt.financial.currentBalance, 0);

        report[bucket] = {
          count: debts.length,
          totalAmount,
          debts: debts.map((debt) => debt.getCollectionSummary()),
        };
      }

      return report;
    } catch (error) {
      console.error('Error generating aging report:', error);
      throw error;
    }
  }

  /**
   * Get collection effectiveness report
   */
  async getCollectionEffectivenessReport(startDate, endDate) {
    try {
      const filter = {};
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const debts = await BadDebt.find(filter);

      const totalDebts = debts.length;
      const totalOriginalAmount = debts.reduce((sum, d) => sum + d.financial.originalAmount, 0);
      const totalCollected = debts.reduce((sum, d) => sum + d.financial.collectedAmount, 0);
      const totalWrittenOff = debts.reduce((sum, d) => sum + d.financial.writeOffAmount, 0);

      // Collection rates by status
      const byStatus = {};
      const statusCounts = {};

      debts.forEach((debt) => {
        if (!byStatus[debt.status]) {
          byStatus[debt.status] = {
            count: 0,
            originalAmount: 0,
            collectedAmount: 0,
            writeOffAmount: 0,
            currentBalance: 0,
          };
        }

        byStatus[debt.status].count += 1;
        byStatus[debt.status].originalAmount += debt.financial.originalAmount;
        byStatus[debt.status].collectedAmount += debt.financial.collectedAmount;
        byStatus[debt.status].writeOffAmount += debt.financial.writeOffAmount;
        byStatus[debt.status].currentBalance += debt.financial.currentBalance;
      });

      // Calculate collection rates
      Object.keys(byStatus).forEach((status) => {
        const data = byStatus[status];
        data.collectionRate =
          data.originalAmount > 0
            ? ((data.collectedAmount / data.originalAmount) * 100).toFixed(2) + '%'
            : '0%';
      });

      // Collection efforts analysis
      const totalEfforts = debts.reduce((sum, d) => sum + d.collectionEfforts.length, 0);
      const avgEffortsPerDebt = totalDebts > 0 ? (totalEfforts / totalDebts).toFixed(2) : 0;

      // Time to collection analysis
      const collectedDebts = debts.filter((d) => d.financial.collectedAmount > 0);
      const avgDaysToCollection =
        collectedDebts.length > 0
          ? collectedDebts.reduce((sum, d) => {
              if (d.financial.lastPaymentDate && d.financial.firstBillingDate) {
                return (
                  sum +
                  Math.floor(
                    (d.financial.lastPaymentDate - d.financial.firstBillingDate) /
                      (1000 * 60 * 60 * 24)
                  )
                );
              }
              return sum;
            }, 0) / collectedDebts.length
          : 0;

      return {
        period: { startDate, endDate },
        overview: {
          totalDebts,
          totalOriginalAmount,
          totalCollected,
          totalWrittenOff,
          outstandingBalance: totalOriginalAmount - totalCollected - totalWrittenOff,
          overallCollectionRate:
            totalOriginalAmount > 0
              ? ((totalCollected / totalOriginalAmount) * 100).toFixed(2) + '%'
              : '0%',
        },
        byStatus,
        collectionEfforts: {
          totalEfforts,
          avgEffortsPerDebt,
          avgDaysToCollection: avgDaysToCollection.toFixed(0),
        },
      };
    } catch (error) {
      console.error('Error generating collection effectiveness report:', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary() {
    try {
      const [totalActive, highPriority, requireAction, inExternalCollection, statistics] =
        await Promise.all([
          BadDebt.countDocuments({ status: { $in: ['identified', 'in_collection'] } }),
          BadDebt.countDocuments({
            status: { $in: ['identified', 'in_collection'] },
            priority: { $in: ['high', 'critical'] },
          }),
          BadDebt.getRequiringAction(),
          BadDebt.countDocuments({ status: 'external_collection' }),
          BadDebt.getStatistics(),
        ]);

      return {
        overview: {
          totalActive,
          highPriority,
          requireAction: requireAction.length,
          inExternalCollection,
        },
        statistics,
        actionRequired: requireAction.slice(0, 10), // Top 10 requiring action
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }
}

module.exports = new BadDebtService();
