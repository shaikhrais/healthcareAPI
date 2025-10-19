const mongoose = require('mongoose');

/**
 * Allergy Alert Model
 * Manages drug-allergy checking and patient allergy records
 */

const allergyAlertSchema = new mongoose.Schema({
  // Allergy Information
  allergen: {
    type: String,
    required: true,
    index: true,
  },
  
  // Related drugs/substances that may cross-react
  crossReactiveSubstances: [String],
  
  // Reaction Details
  reactionType: {
    type: String,
    enum: ['mild', 'moderate', 'severe', 'anaphylaxis'],
    required: true,
  },
  
  symptoms: [String],
  
  description: String,
  
  // Contraindicated medications
  contraindicatedDrugs: [String],
  
  // Alternative medications
  alternatives: [String],
  
  // Clinical guidance
  clinicalNotes: String,
  
  // Status
  active: {
    type: Boolean,
    default: true,
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
allergyAlertSchema.index({ allergen: 1, active: 1 });
allergyAlertSchema.index({ contraindicatedDrugs: 1 });

// Static methods
allergyAlertSchema.statics.checkAllergies = async function(patientAllergies, newMedication) {
  if (!patientAllergies || patientAllergies.length === 0) {
    return [];
  }

  const alerts = [];
  const normalizedMed = this.normalizeDrugName(newMedication);
  
  for (const allergy of patientAllergies) {
    const normalizedAllergy = allergy.toLowerCase().trim();
    
    // Find allergy records
    const allergyRecord = await this.findOne({
      $or: [
        { allergen: { $regex: normalizedAllergy, $options: 'i' } },
        { crossReactiveSubstances: { $regex: normalizedAllergy, $options: 'i' } }
      ],
      active: true
    });
    
    if (allergyRecord) {
      // Check if medication contains contraindicated drugs
      const isContraindicated = allergyRecord.contraindicatedDrugs.some(drug =>
        normalizedMed.includes(drug.toLowerCase()) || 
        drug.toLowerCase().includes(normalizedMed)
      );
      
      if (isContraindicated) {
        alerts.push({
          allergy: allergy,
          medication: newMedication,
          severity: allergyRecord.reactionType,
          alert: `ALLERGY ALERT: Patient is allergic to ${allergy}. ${newMedication} may cause allergic reaction.`,
          alternatives: allergyRecord.alternatives,
          clinicalNotes: allergyRecord.clinicalNotes,
          symptoms: allergyRecord.symptoms,
        });
      }
    }
    
    // Also do direct string matching for common patterns
    if (this.checkDirectAllergyMatch(allergy, newMedication)) {
      alerts.push({
        allergy: allergy,
        medication: newMedication,
        severity: 'severe',
        alert: `CRITICAL ALLERGY ALERT: Patient has documented allergy to ${allergy}. Do not administer ${newMedication} without careful review.`,
        alternatives: [],
        clinicalNotes: 'Direct allergy match detected. Verify allergy details and consider alternatives.',
        symptoms: ['Unknown - verify with patient'],
      });
    }
  }
  
  return alerts;
};

allergyAlertSchema.statics.checkDirectAllergyMatch = function(allergy, medication) {
  const allergyNorm = allergy.toLowerCase().replace(/[^a-z]/g, '');
  const medNorm = medication.toLowerCase().replace(/[^a-z]/g, '');
  
  // Check for direct substring matches
  return allergyNorm.includes(medNorm) || medNorm.includes(allergyNorm);
};

allergyAlertSchema.statics.normalizeDrugName = function(drugName) {
  if (!drugName) return '';
  
  return drugName
    .toLowerCase()
    .replace(/\s*\d+\s*mg.*$/i, '')
    .replace(/\s*\d+\s*mcg.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

allergyAlertSchema.statics.seedCommonAllergies = async function() {
  const commonAllergies = [
    {
      allergen: 'penicillin',
      crossReactiveSubstances: ['amoxicillin', 'ampicillin', 'benzylpenicillin'],
      reactionType: 'severe',
      symptoms: ['Rash', 'Hives', 'Swelling', 'Difficulty breathing', 'Anaphylaxis'],
      contraindicatedDrugs: ['penicillin', 'amoxicillin', 'ampicillin', 'penicillin g', 'penicillin v'],
      alternatives: ['cephalexin (if no cephalosporin allergy)', 'azithromycin', 'clindamycin'],
      clinicalNotes: 'Penicillin allergy is common. Verify reaction type and consider penicillin skin testing if unclear.',
    },
    {
      allergen: 'sulfa',
      crossReactiveSubstances: ['sulfamethoxazole', 'sulfisoxazole', 'sulfadiazine'],
      reactionType: 'moderate',
      symptoms: ['Rash', 'Stevens-Johnson syndrome', 'Photosensitivity'],
      contraindicatedDrugs: ['bactrim', 'sulfamethoxazole', 'trimethoprim-sulfamethoxazole'],
      alternatives: ['ciprofloxacin', 'nitrofurantoin', 'fosfomycin'],
      clinicalNotes: 'Sulfa allergy may not contraindicate all sulfonamides. Diuretics like furosemide are generally safe.',
    },
    {
      allergen: 'latex',
      crossReactiveSubstances: ['rubber', 'natural latex'],
      reactionType: 'severe',
      symptoms: ['Contact dermatitis', 'Respiratory symptoms', 'Anaphylaxis'],
      contraindicatedDrugs: [],
      alternatives: [],
      clinicalNotes: 'Use latex-free gloves and equipment. May cross-react with certain foods (banana, avocado, kiwi).',
    },
    {
      allergen: 'iodine',
      crossReactiveSubstances: ['iodinated contrast', 'betadine', 'povidone-iodine'],
      reactionType: 'moderate',
      symptoms: ['Rash', 'Hives', 'Respiratory distress'],
      contraindicatedDrugs: ['iodinated contrast media'],
      alternatives: ['gadolinium contrast', 'non-contrast imaging'],
      clinicalNotes: 'True iodine allergy is rare. Most reactions are to contrast media components, not iodine itself.',
    },
    {
      allergen: 'aspirin',
      crossReactiveSubstances: ['salicylates', 'nsaids'],
      reactionType: 'moderate',
      symptoms: ['Asthma exacerbation', 'Rhinitis', 'Urticaria'],
      contraindicatedDrugs: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
      alternatives: ['acetaminophen', 'celecoxib (if no sulfa allergy)'],
      clinicalNotes: 'NSAID allergy may manifest as asthma triad (asthma, nasal polyps, aspirin sensitivity).',
    },
  ];

  for (const allergy of commonAllergies) {
    await this.findOneAndUpdate(
      { allergen: allergy.allergen },
      allergy,
      { upsert: true, new: true }
    );
  }

  console.log(`✅ Seeded ${commonAllergies.length} common allergy alerts`);
};

module.exports = mongoose.model('AllergyAlert', allergyAlertSchema);