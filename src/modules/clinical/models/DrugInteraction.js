const mongoose = require('mongoose');

/**
 * Drug Interaction Model
 * Manages drug-to-drug interactions and allergy checking
 * For production: integrate with FDA Orange Book, RxNorm, or commercial drug database
 */

const drugInteractionSchema = new mongoose.Schema({
  // Drug Information
  drugA: {
    type: String,
    required: true,
    index: true,
  },
  drugB: {
    type: String,
    required: true,
    index: true,
  },

  // Interaction Details
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'contraindicated'],
    required: true,
    index: true,
  },
  
  description: {
    type: String,
    required: true,
  },
  
  mechanism: String,
  
  clinicalEffects: [String],
  
  management: String,
  
  // Evidence Level
  evidenceLevel: {
    type: String,
    enum: ['theoretical', 'anecdotal', 'study', 'established'],
    default: 'study',
  },

  // References
  sources: [String],
  
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
drugInteractionSchema.index({ drugA: 1, drugB: 1 }, { unique: true });
drugInteractionSchema.index({ severity: 1, active: 1 });

// Static methods
drugInteractionSchema.statics.checkInteractions = async function(medications) {
  if (!medications || medications.length < 2) {
    return [];
  }

  const interactions = [];
  
  // Check all pairs of medications
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const drugA = this.normalizeDrugName(medications[i]);
      const drugB = this.normalizeDrugName(medications[j]);
      
      // Check both directions (A-B and B-A)
      const interaction = await this.findOne({
        $or: [
          { drugA: drugA, drugB: drugB },
          { drugA: drugB, drugB: drugA }
        ],
        active: true
      });
      
      if (interaction) {
        interactions.push({
          ...interaction.toObject(),
          medications: [medications[i], medications[j]],
        });
      }
    }
  }
  
  // Sort by severity (contraindicated first)
  const severityOrder = { contraindicated: 0, major: 1, moderate: 2, minor: 3 };
  interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return interactions;
};

drugInteractionSchema.statics.checkSingleDrug = async function(newMedication, existingMedications) {
  if (!existingMedications || existingMedications.length === 0) {
    return [];
  }

  const newDrug = this.normalizeDrugName(newMedication);
  const interactions = [];
  
  for (const existing of existingMedications) {
    const existingDrug = this.normalizeDrugName(existing);
    
    const interaction = await this.findOne({
      $or: [
        { drugA: newDrug, drugB: existingDrug },
        { drugA: existingDrug, drugB: newDrug }
      ],
      active: true
    });
    
    if (interaction) {
      interactions.push({
        ...interaction.toObject(),
        medications: [newMedication, existing],
      });
    }
  }
  
  return interactions;
};

drugInteractionSchema.statics.normalizeDrugName = function(drugName) {
  if (!drugName) return '';
  
  // Remove dosage information and normalize
  return drugName
    .toLowerCase()
    .replace(/\s*\d+\s*mg.*$/i, '') // Remove dosage like "10mg", "500 mg daily"
    .replace(/\s*\d+\s*mcg.*$/i, '') // Remove micrograms
    .replace(/\s*\d+\/\d+.*$/i, '') // Remove combination dosages
    .replace(/\s+/g, ' ')
    .trim();
};

drugInteractionSchema.statics.seedCommonInteractions = async function() {
  const commonInteractions = [
    {
      drugA: 'warfarin',
      drugB: 'aspirin',
      severity: 'major',
      description: 'Increased risk of bleeding when warfarin is combined with aspirin',
      mechanism: 'Additive anticoagulant effects',
      clinicalEffects: ['Increased bleeding risk', 'Prolonged clotting time'],
      management: 'Monitor INR closely, consider dose adjustment, watch for bleeding signs',
      evidenceLevel: 'established',
    },
    {
      drugA: 'metformin',
      drugB: 'iodinated contrast',
      severity: 'major',
      description: 'Risk of lactic acidosis when metformin is used with contrast media',
      mechanism: 'Contrast can cause acute kidney injury, reducing metformin clearance',
      clinicalEffects: ['Lactic acidosis', 'Kidney dysfunction'],
      management: 'Hold metformin 48 hours before and after contrast administration',
      evidenceLevel: 'established',
    },
    {
      drugA: 'lisinopril',
      drugB: 'potassium',
      severity: 'moderate',
      description: 'ACE inhibitors can increase potassium levels',
      mechanism: 'Reduced aldosterone activity',
      clinicalEffects: ['Hyperkalemia', 'Cardiac arrhythmias'],
      management: 'Monitor potassium levels regularly',
      evidenceLevel: 'established',
    },
    {
      drugA: 'digoxin',
      drugB: 'furosemide',
      severity: 'moderate',
      description: 'Diuretics can increase digoxin toxicity risk',
      mechanism: 'Electrolyte imbalance (hypokalemia) increases digoxin sensitivity',
      clinicalEffects: ['Digoxin toxicity', 'Arrhythmias'],
      management: 'Monitor digoxin levels and electrolytes',
      evidenceLevel: 'established',
    },
    {
      drugA: 'omeprazole',
      drugB: 'clopidogrel',
      severity: 'moderate',
      description: 'Proton pump inhibitors may reduce clopidogrel effectiveness',
      mechanism: 'CYP2C19 inhibition',
      clinicalEffects: ['Reduced antiplatelet effect'],
      management: 'Consider alternative PPI or H2 blocker',
      evidenceLevel: 'established',
    },
  ];

  for (const interaction of commonInteractions) {
    await this.findOneAndUpdate(
      { 
        $or: [
          { drugA: interaction.drugA, drugB: interaction.drugB },
          { drugA: interaction.drugB, drugB: interaction.drugA }
        ]
      },
      interaction,
      { upsert: true, new: true }
    );
  }

  console.log(`✅ Seeded ${commonInteractions.length} common drug interactions`);
};

module.exports = mongoose.model('DrugInteraction', drugInteractionSchema);