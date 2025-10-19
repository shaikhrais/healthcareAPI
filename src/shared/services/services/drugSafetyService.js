const DrugInteraction = require('../models/DrugInteraction');
const AllergyAlert = require('../models/AllergyAlert');
const Patient = require('../models/Patient');

/**
 * Drug Safety Service
 * Provides drug interaction and allergy checking functionality
 */

class DrugSafetyService {
  /**
   * Check for drug interactions when adding a new medication
   */
  async checkDrugInteractions(patientId, newMedication) {
    try {
      // Get patient's current medications
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const currentMedications = patient.medicalHistory?.medications || [];
      
      // Check interactions with existing medications
      const interactions = await DrugInteraction.checkSingleDrug(newMedication, currentMedications);
      
      return {
        hasInteractions: interactions.length > 0,
        interactions: interactions,
        riskLevel: this.calculateRiskLevel(interactions),
        recommendations: this.generateRecommendations(interactions),
      };
    } catch (error) {
      throw new Error(`Drug interaction check failed: ${error.message}`);
    }
  }

  /**
   * Check for allergy alerts when prescribing medication
   */
  async checkAllergyAlerts(patientId, newMedication) {
    try {
      // Get patient's allergies
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const patientAllergies = patient.medicalHistory?.allergies || [];
      
      // Check for allergy conflicts
      const alerts = await AllergyAlert.checkAllergies(patientAllergies, newMedication);
      
      return {
        hasAlerts: alerts.length > 0,
        alerts: alerts,
        riskLevel: this.calculateAllergyRisk(alerts),
        blockPrescribing: alerts.some(alert => alert.severity === 'severe'),
      };
    } catch (error) {
      throw new Error(`Allergy check failed: ${error.message}`);
    }
  }

  /**
   * Comprehensive medication safety check
   */
  async performSafetyCheck(patientId, newMedication) {
    try {
      const [interactionCheck, allergyCheck] = await Promise.all([
        this.checkDrugInteractions(patientId, newMedication),
        this.checkAllergyAlerts(patientId, newMedication),
      ]);

      const overallRisk = this.calculateOverallRisk(interactionCheck.riskLevel, allergyCheck.riskLevel);
      
      return {
        medication: newMedication,
        patientId: patientId,
        safeToAdminister: !allergyCheck.blockPrescribing && overallRisk !== 'critical',
        overallRisk: overallRisk,
        interactions: interactionCheck,
        allergies: allergyCheck,
        recommendations: [
          ...interactionCheck.recommendations,
          ...this.generateAllergyRecommendations(allergyCheck.alerts),
        ],
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Safety check failed: ${error.message}`);
    }
  }

  /**
   * Bulk check all current medications for a patient
   */
  async checkAllMedications(patientId) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const medications = patient.medicalHistory?.medications || [];
      
      if (medications.length < 2) {
        return {
          patientId: patientId,
          medications: medications,
          interactions: [],
          hasInteractions: false,
          riskLevel: 'none',
        };
      }

      const interactions = await DrugInteraction.checkInteractions(medications);
      
      return {
        patientId: patientId,
        medications: medications,
        interactions: interactions,
        hasInteractions: interactions.length > 0,
        riskLevel: this.calculateRiskLevel(interactions),
        recommendations: this.generateRecommendations(interactions),
      };
    } catch (error) {
      throw new Error(`Bulk medication check failed: ${error.message}`);
    }
  }

  /**
   * Calculate risk level from drug interactions
   */
  calculateRiskLevel(interactions) {
    if (!interactions || interactions.length === 0) return 'none';
    
    const severities = interactions.map(i => i.severity);
    
    if (severities.includes('contraindicated')) return 'critical';
    if (severities.includes('major')) return 'high';
    if (severities.includes('moderate')) return 'medium';
    return 'low';
  }

  /**
   * Calculate risk level from allergy alerts
   */
  calculateAllergyRisk(alerts) {
    if (!alerts || alerts.length === 0) return 'none';
    
    const severities = alerts.map(a => a.severity);
    
    if (severities.includes('anaphylaxis')) return 'critical';
    if (severities.includes('severe')) return 'high';
    if (severities.includes('moderate')) return 'medium';
    return 'low';
  }

  /**
   * Calculate overall risk from interaction and allergy risks
   */
  calculateOverallRisk(interactionRisk, allergyRisk) {
    const riskLevels = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
    const maxRisk = Math.max(riskLevels[interactionRisk], riskLevels[allergyRisk]);
    
    const levelNames = ['none', 'low', 'medium', 'high', 'critical'];
    return levelNames[maxRisk];
  }

  /**
   * Generate recommendations for drug interactions
   */
  generateRecommendations(interactions) {
    const recommendations = [];
    
    for (const interaction of interactions) {
      let recommendation = '';
      
      switch (interaction.severity) {
        case 'contraindicated':
          recommendation = `AVOID: Do not use ${interaction.medications.join(' with ')}. ${interaction.management || 'Consider alternative medications.'}`;
          break;
        case 'major':
          recommendation = `CAUTION: Monitor closely when using ${interaction.medications.join(' with ')}. ${interaction.management || 'Consider dose adjustment or alternative.'}`;
          break;
        case 'moderate':
          recommendation = `MONITOR: Watch for effects when using ${interaction.medications.join(' with ')}. ${interaction.management || 'Regular monitoring recommended.'}`;
          break;
        case 'minor':
          recommendation = `AWARE: Minor interaction between ${interaction.medications.join(' and ')}. ${interaction.management || 'No action typically needed.'}`;
          break;
      }
      
      recommendations.push(recommendation);
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations for allergy alerts
   */
  generateAllergyRecommendations(alerts) {
    const recommendations = [];
    
    for (const alert of alerts) {
      let recommendation = `ALLERGY ALERT: Patient allergic to ${alert.allergy}. `;
      
      if (alert.alternatives && alert.alternatives.length > 0) {
        recommendation += `Consider alternatives: ${alert.alternatives.join(', ')}. `;
      }
      
      if (alert.clinicalNotes) {
        recommendation += alert.clinicalNotes;
      }
      
      recommendations.push(recommendation);
    }
    
    return recommendations;
  }

  /**
   * Get drug interaction statistics for dashboard
   */
  async getInteractionStats() {
    try {
      const [
        totalInteractions,
        severityStats,
        recentChecks
      ] = await Promise.all([
        DrugInteraction.countDocuments({ active: true }),
        DrugInteraction.aggregate([
          { $match: { active: true } },
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]),
        // This would need to be implemented with a check log
        Promise.resolve([])
      ]);

      return {
        totalInteractions,
        severityBreakdown: severityStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentChecks,
      };
    } catch (error) {
      throw new Error(`Failed to get interaction stats: ${error.message}`);
    }
  }
}

module.exports = new DrugSafetyService();