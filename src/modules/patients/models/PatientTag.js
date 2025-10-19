const mongoose = require('mongoose');

/**
 * Patient Tag Model
 * Manages patient tags for organization and filtering
 */

const patientTagSchema = new mongoose.Schema({
  // Tag Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  
  description: {
    type: String,
    maxLength: 200,
  },
  
  // Visual Properties
  color: {
    type: String,
    default: '#2196F3', // Blue default
    match: /^#[0-9A-Fa-f]{6}$/,
  },
  
  icon: {
    type: String,
    default: 'label',
  },
  
  // Tag Type
  type: {
    type: String,
    enum: ['system', 'custom', 'auto'],
    default: 'custom',
  },
  
  // Category
  category: {
    type: String,
    enum: ['medical', 'administrative', 'behavior', 'demographics', 'financial', 'other'],
    default: 'other',
  },
  
  // Organization
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  
  // Usage Statistics
  patientCount: {
    type: Number,
    default: 0,
  },
  
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  
  // Status
  active: {
    type: Boolean,
    default: true,
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
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

// Indexes
patientTagSchema.index({ organizationId: 1, name: 1 }, { unique: true });
patientTagSchema.index({ organizationId: 1, category: 1 });
patientTagSchema.index({ organizationId: 1, active: 1 });

// Virtual for patients with this tag
patientTagSchema.virtual('patients', {
  ref: 'Patient',
  localField: '_id',
  foreignField: 'tags',
});

// Static methods
patientTagSchema.statics.getPopularTags = async function(organizationId, limit = 10) {
  return this.find({
    organizationId,
    active: true,
  })
  .sort({ patientCount: -1, lastUsed: -1 })
  .limit(limit);
};

patientTagSchema.statics.getTagsByCategory = async function(organizationId, category) {
  return this.find({
    organizationId,
    category,
    active: true,
  })
  .sort({ name: 1 });
};

patientTagSchema.statics.searchTags = async function(organizationId, searchTerm) {
  return this.find({
    organizationId,
    active: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  })
  .sort({ patientCount: -1 });
};

// Instance methods
patientTagSchema.methods.incrementUsage = async function() {
  this.lastUsed = new Date();
  this.patientCount = await mongoose.model('Patient').countDocuments({
    tags: this._id
  });
  return this.save();
};

patientTagSchema.methods.updatePatientCount = async function() {
  this.patientCount = await mongoose.model('Patient').countDocuments({
    tags: this._id
  });
  return this.save();
};

// Pre-save middleware
patientTagSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Seed default tags
patientTagSchema.statics.seedDefaultTags = async function(organizationId, userId) {
  const defaultTags = [
    // Medical Tags
    { name: 'VIP Patient', category: 'administrative', color: '#9C27B0', icon: 'star' },
    { name: 'High Risk', category: 'medical', color: '#F44336', icon: 'warning' },
    { name: 'Diabetic', category: 'medical', color: '#FF9800', icon: 'medical' },
    { name: 'Hypertension', category: 'medical', color: '#FF5722', icon: 'heart' },
    { name: 'Chronic Pain', category: 'medical', color: '#795548', icon: 'body' },
    
    // Behavioral Tags
    { name: 'Anxious', category: 'behavior', color: '#607D8B', icon: 'sad' },
    { name: 'No-Show Risk', category: 'behavior', color: '#E91E63', icon: 'time' },
    { name: 'Excellent Compliance', category: 'behavior', color: '#4CAF50', icon: 'checkmark-circle' },
    
    // Administrative Tags
    { name: 'New Patient', category: 'administrative', color: '#2196F3', icon: 'person-add' },
    { name: 'Referral', category: 'administrative', color: '#00BCD4', icon: 'share' },
    { name: 'Insurance Issues', category: 'financial', color: '#FFC107', icon: 'card' },
    { name: 'Payment Plan', category: 'financial', color: '#FF9800', icon: 'cash' },
    
    // Demographics
    { name: 'Senior (65+)', category: 'demographics', color: '#9E9E9E', icon: 'person' },
    { name: 'Pediatric', category: 'demographics', color: '#E1BEE7', icon: 'happy' },
    { name: 'Pregnant', category: 'demographics', color: '#F8BBD9', icon: 'heart' },
    
    // Program Tags
    { name: 'Wellness Program', category: 'administrative', color: '#8BC34A', icon: 'fitness' },
    { name: 'Weight Loss Program', category: 'medical', color: '#CDDC39', icon: 'scale' },
    { name: 'Research Study', category: 'administrative', color: '#3F51B5', icon: 'search' },
  ];

  for (const tagData of defaultTags) {
    try {
      await this.findOneAndUpdate(
        { 
          organizationId, 
          name: tagData.name 
        },
        {
          ...tagData,
          organizationId,
          createdBy: userId,
          type: 'system',
        },
        { 
          upsert: true, 
          new: true 
        }
      );
    } catch (error) {
      // Skip duplicates
      continue;
    }
  }

  console.log(`✅ Seeded ${defaultTags.length} default patient tags`);
};

module.exports = mongoose.model('PatientTag', patientTagSchema);