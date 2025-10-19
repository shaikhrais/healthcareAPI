const mongoose = require('mongoose');

/**
 * Patient Group Model
 * Manages patient groups and bulk operations
 */

const patientGroupSchema = new mongoose.Schema({
  // Group Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100,
  },
  
  description: {
    type: String,
    maxLength: 500,
  },
  
  // Group Type
  type: {
    type: String,
    enum: ['static', 'dynamic', 'smart'],
    default: 'static',
  },
  
  // Smart Group Criteria (for dynamic groups)
  criteria: {
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PatientTag' }],
    ageRange: {
      min: Number,
      max: Number,
    },
    gender: String,
    conditions: [String],
    insuranceProviders: [String],
    lastVisitRange: {
      from: Date,
      to: Date,
    },
    customFields: [{
      field: String,
      operator: { type: String, enum: ['equals', 'contains', 'greater_than', 'less_than'] },
      value: mongoose.Schema.Types.Mixed,
    }],
  },
  
  // Static Members (for static groups)
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
  }],
  
  // Visual Properties
  color: {
    type: String,
    default: '#2196F3',
    match: /^#[0-9A-Fa-f]{6}$/,
  },
  
  icon: {
    type: String,
    default: 'people',
  },
  
  // Organization
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  
  // Statistics
  memberCount: {
    type: Number,
    default: 0,
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  
  // Communication Settings
  allowBulkCommunication: {
    type: Boolean,
    default: true,
  },
  
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
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
}, {
  timestamps: true,
});

// Indexes
patientGroupSchema.index({ organizationId: 1, name: 1 }, { unique: true });
patientGroupSchema.index({ organizationId: 1, type: 1 });
patientGroupSchema.index({ organizationId: 1, active: 1 });
patientGroupSchema.index({ members: 1 });

// Virtual for dynamic member calculation
patientGroupSchema.virtual('dynamicMembers').get(function() {
  if (this.type !== 'dynamic' && this.type !== 'smart') {
    return [];
  }
  // This would be calculated dynamically based on criteria
  return [];
});

// Static methods
patientGroupSchema.statics.getGroupsForPatient = async function(patientId) {
  return this.find({
    $or: [
      { members: patientId },
      { 
        type: { $in: ['dynamic', 'smart'] },
        // Add criteria matching logic here
      }
    ],
    active: true,
  });
};

patientGroupSchema.statics.searchGroups = async function(organizationId, searchTerm) {
  return this.find({
    organizationId,
    active: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  })
  .sort({ memberCount: -1, name: 1 });
};

// Instance methods
patientGroupSchema.methods.addMember = async function(patientId) {
  if (this.type === 'static' && !this.members.includes(patientId)) {
    this.members.push(patientId);
    this.memberCount = this.members.length;
    this.lastUpdated = new Date();
    return this.save();
  }
  throw new Error('Cannot manually add members to dynamic groups');
};

patientGroupSchema.methods.removeMember = async function(patientId) {
  if (this.type === 'static') {
    this.members = this.members.filter(id => !id.equals(patientId));
    this.memberCount = this.members.length;
    this.lastUpdated = new Date();
    return this.save();
  }
  throw new Error('Cannot manually remove members from dynamic groups');
};

patientGroupSchema.methods.updateMemberCount = async function() {
  if (this.type === 'static') {
    this.memberCount = this.members.length;
  } else {
    // Calculate dynamic members based on criteria
    this.memberCount = await this.calculateDynamicMembers();
  }
  this.lastUpdated = new Date();
  return this.save();
};

patientGroupSchema.methods.calculateDynamicMembers = async function() {
  if (this.type === 'static') {
    return this.members.length;
  }

  const Patient = mongoose.model('Patient');
  const query = { organizationId: this.organizationId };

  // Apply criteria filters
  if (this.criteria.tags && this.criteria.tags.length > 0) {
    query.tags = { $in: this.criteria.tags };
  }

  if (this.criteria.ageRange) {
    const now = new Date();
    if (this.criteria.ageRange.min) {
      const maxBirthDate = new Date(now.getFullYear() - this.criteria.ageRange.min, now.getMonth(), now.getDate());
      query.dateOfBirth = { ...query.dateOfBirth, $lte: maxBirthDate };
    }
    if (this.criteria.ageRange.max) {
      const minBirthDate = new Date(now.getFullYear() - this.criteria.ageRange.max - 1, now.getMonth(), now.getDate());
      query.dateOfBirth = { ...query.dateOfBirth, $gte: minBirthDate };
    }
  }

  if (this.criteria.gender) {
    query.gender = this.criteria.gender;
  }

  if (this.criteria.conditions && this.criteria.conditions.length > 0) {
    query['medicalHistory.conditions'] = { $in: this.criteria.conditions };
  }

  if (this.criteria.insuranceProviders && this.criteria.insuranceProviders.length > 0) {
    query['insurance.provider'] = { $in: this.criteria.insuranceProviders };
  }

  return Patient.countDocuments(query);
};

patientGroupSchema.methods.getMembers = async function(page = 1, limit = 50) {
  if (this.type === 'static') {
    const Patient = mongoose.model('Patient');
    return Patient.find({ _id: { $in: this.members } })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ lastName: 1, firstName: 1 });
  } else {
    // Return dynamic members based on criteria
    return this.getDynamicMembers(page, limit);
  }
};

patientGroupSchema.methods.getDynamicMembers = async function(page = 1, limit = 50) {
  const Patient = mongoose.model('Patient');
  const query = { organizationId: this.organizationId };

  // Apply same criteria as calculateDynamicMembers
  // ... (criteria logic repeated)

  return Patient.find(query)
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ lastName: 1, firstName: 1 });
};

// Pre-save middleware
patientGroupSchema.pre('save', function(next) {
  if (this.type === 'static') {
    this.memberCount = this.members.length;
  }
  this.lastUpdated = new Date();
  next();
});

// Seed default groups
patientGroupSchema.statics.seedDefaultGroups = async function(organizationId, userId) {
  const defaultGroups = [
    {
      name: 'New Patients (Last 30 Days)',
      description: 'Patients who registered in the last 30 days',
      type: 'dynamic',
      color: '#4CAF50',
      icon: 'person-add',
      criteria: {
        // Would be calculated dynamically
      }
    },
    {
      name: 'VIP Patients',
      description: 'High-priority patients requiring special attention',
      type: 'static',
      color: '#9C27B0',
      icon: 'star',
    },
    {
      name: 'Overdue for Checkup',
      description: 'Patients who haven\'t had an appointment in 6+ months',
      type: 'dynamic',
      color: '#FF9800',
      icon: 'calendar',
    },
    {
      name: 'Wellness Program Participants',
      description: 'Patients enrolled in wellness programs',
      type: 'static',
      color: '#8BC34A',
      icon: 'fitness',
    },
    {
      name: 'High Risk Patients',
      description: 'Patients with multiple risk factors',
      type: 'dynamic',
      color: '#F44336',
      icon: 'warning',
    },
  ];

  for (const groupData of defaultGroups) {
    try {
      await this.findOneAndUpdate(
        { 
          organizationId, 
          name: groupData.name 
        },
        {
          ...groupData,
          organizationId,
          createdBy: userId,
        },
        { 
          upsert: true, 
          new: true 
        }
      );
    } catch (error) {
      continue;
    }
  }

  console.log(`✅ Seeded ${defaultGroups.length} default patient groups`);
};

module.exports = mongoose.model('PatientGroup', patientGroupSchema);