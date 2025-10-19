const express = require('express');
const router = express.Router();
const PatientTag = require('../models/PatientTag');
const PatientGroup = require('../models/PatientGroup');
const Patient = require('../models/Patient');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Mock middleware for authorization
const protect = authMiddleware;
const authorize = (...roles) => (req, res, next) => next();

// ========================================
// PATIENT TAGS ROUTES
// ========================================

/**
 * @route   GET /api/patient-tags
 * @desc    Get all patient tags
 * @access  Private
 */
router.get('/tags', protect, authorize('view_patients'), async (req, res) => {
  try {
    const { category, search, popular } = req.query;
    let tags;

    if (popular) {
      tags = await PatientTag.getPopularTags(req.organization._id, 20);
    } else if (category) {
      tags = await PatientTag.getTagsByCategory(req.organization._id, category);
    } else if (search) {
      tags = await PatientTag.searchTags(req.organization._id, search);
    } else {
      tags = await PatientTag.find({
        organizationId: req.organization._id,
        active: true,
      }).sort({ category: 1, name: 1 });
    }

    res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-tags
 * @desc    Create new patient tag
 * @access  Private
 */
router.post('/tags', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const tag = await PatientTag.create({
      ...req.body,
      organizationId: req.organization._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Patient tag created successfully',
      data: tag,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A tag with this name already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/patient-tags/:id
 * @desc    Update patient tag
 * @access  Private
 */
router.put('/tags/:id', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const tag = await PatientTag.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.organization._id 
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    res.json({
      success: true,
      message: 'Tag updated successfully',
      data: tag,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/patient-tags/:id
 * @desc    Delete patient tag
 * @access  Private
 */
router.delete('/tags/:id', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const tag = await PatientTag.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.organization._id 
      },
      { active: false },
      { new: true }
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    // Remove tag from all patients
    await Patient.updateMany(
      { organizationId: req.organization._id },
      { $pull: { tags: req.params.id } }
    );

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-tags/:id/patients
 * @desc    Get patients with specific tag
 * @access  Private
 */
router.get('/tags/:id/patients', protect, authorize('view_patients'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const patients = await Patient.find({
      organizationId: req.organization._id,
      tags: req.params.id,
    })
    .populate('tags', 'name color')
    .select('firstName lastName email phone dateOfBirth')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ lastName: 1, firstName: 1 });

    const total = await Patient.countDocuments({
      organizationId: req.organization._id,
      tags: req.params.id,
    });

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================================
// PATIENT GROUPS ROUTES
// ========================================

/**
 * @route   GET /api/patient-groups
 * @desc    Get all patient groups
 * @access  Private
 */
router.get('/groups', protect, authorize('view_patients'), async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = {
      organizationId: req.organization._id,
      active: true,
    };

    if (type) {
      query.type = type;
    }

    let groups;
    if (search) {
      groups = await PatientGroup.searchGroups(req.organization._id, search);
    } else {
      groups = await PatientGroup.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ memberCount: -1, name: 1 });
    }

    res.json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-groups
 * @desc    Create new patient group
 * @access  Private
 */
router.post('/groups', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.create({
      ...req.body,
      organizationId: req.organization._id,
      createdBy: req.user._id,
    });

    // Update member count if dynamic
    if (group.type === 'dynamic' || group.type === 'smart') {
      await group.updateMemberCount();
    }

    res.status(201).json({
      success: true,
      message: 'Patient group created successfully',
      data: group,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A group with this name already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-groups/:id
 * @desc    Get specific patient group
 * @access  Private
 */
router.get('/groups/:id', protect, authorize('view_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    })
    .populate('createdBy', 'firstName lastName')
    .populate('criteria.tags', 'name color');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-groups/:id/members
 * @desc    Get members of patient group
 * @access  Private
 */
router.get('/groups/:id/members', protect, authorize('view_patients'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const group = await PatientGroup.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const members = await group.getMembers(parseInt(page), parseInt(limit));
    const memberCount = group.type === 'static' ? 
      group.members.length : 
      await group.calculateDynamicMembers();

    res.json({
      success: true,
      data: {
        members,
        group: {
          _id: group._id,
          name: group.name,
          type: group.type,
          memberCount,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: memberCount,
          pages: Math.ceil(memberCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-groups/:id/members/:patientId
 * @desc    Add patient to group
 * @access  Private
 */
router.post('/groups/:id/members/:patientId', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    await group.addMember(req.params.patientId);

    res.json({
      success: true,
      message: 'Patient added to group successfully',
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/patient-groups/:id/members/:patientId
 * @desc    Remove patient from group
 * @access  Private
 */
router.delete('/groups/:id/members/:patientId', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    await group.removeMember(req.params.patientId);

    res.json({
      success: true,
      message: 'Patient removed from group successfully',
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/patient-groups/:id
 * @desc    Update patient group
 * @access  Private
 */
router.put('/groups/:id', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.organization._id 
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Update member count if criteria changed
    if (group.type === 'dynamic' || group.type === 'smart') {
      await group.updateMemberCount();
    }

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/patient-groups/:id
 * @desc    Delete patient group
 * @access  Private
 */
router.delete('/groups/:id', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const group = await PatientGroup.findOneAndUpdate(
      { 
        _id: req.params.id, 
        organizationId: req.organization._id 
      },
      { active: false },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * @route   POST /api/patient-organization/bulk/add-tags
 * @desc    Add tags to multiple patients
 * @access  Private
 */
router.post('/bulk/add-tags', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const { patientIds, tagIds } = req.body;

    if (!patientIds || !tagIds || patientIds.length === 0 || tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient IDs and tag IDs are required',
      });
    }

    // Add tags to patients
    await Patient.updateMany(
      { 
        _id: { $in: patientIds },
        organizationId: req.organization._id 
      },
      { $addToSet: { tags: { $each: tagIds } } }
    );

    // Update tag usage counts
    for (const tagId of tagIds) {
      const tag = await PatientTag.findById(tagId);
      if (tag) {
        await tag.incrementUsage();
      }
    }

    res.json({
      success: true,
      message: `Tags added to ${patientIds.length} patients successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-organization/bulk/remove-tags
 * @desc    Remove tags from multiple patients
 * @access  Private
 */
router.post('/bulk/remove-tags', protect, authorize('manage_patients'), async (req, res) => {
  try {
    const { patientIds, tagIds } = req.body;

    if (!patientIds || !tagIds || patientIds.length === 0 || tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient IDs and tag IDs are required',
      });
    }

    await Patient.updateMany(
      { 
        _id: { $in: patientIds },
        organizationId: req.organization._id 
      },
      { $pullAll: { tags: tagIds } }
    );

    // Update tag usage counts
    for (const tagId of tagIds) {
      const tag = await PatientTag.findById(tagId);
      if (tag) {
        await tag.updatePatientCount();
      }
    }

    res.json({
      success: true,
      message: `Tags removed from ${patientIds.length} patients successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-organization/seed
 * @desc    Seed default tags and groups
 * @access  Private (Admin only)
 */
router.post('/seed', protect, authorize('manage_system'), async (req, res) => {
  try {
    await Promise.all([
      PatientTag.seedDefaultTags(req.organization._id, req.user._id),
      PatientGroup.seedDefaultGroups(req.organization._id, req.user._id),
    ]);

    res.json({
      success: true,
      message: 'Patient tags and groups seeded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;