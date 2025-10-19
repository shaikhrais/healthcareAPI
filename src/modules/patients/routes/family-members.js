const express = require('express');

const FamilyMember = require('../models/FamilyMember');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Mock middleware for authorization (can be implemented later)
const protect = authMiddleware;
const authorize = (...roles) => (req, res, next) => next();
/**
 * Family Member Routes
 *
 * Endpoints for managing family members and dependents
 */

const router = express.Router();
// ==================== FAMILY MEMBERS ====================

/**
 * @route   GET /api/family-members
 * @desc    Get family members for authenticated patient
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;

    // Get family members where user is the primary account holder
    const members = await FamilyMember.getFamilyMembers(req.user._id, includeInactive === 'true');

    res.json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family members',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/family-members/:id
 * @desc    Get single family member
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone dateOfBirth')
      .populate('primaryPatientId', 'firstName lastName email phone')
      .populate('sharedResources.insuranceCardId')
      .populate('legalGuardians.guardianId', 'firstName lastName email phone');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization - must be primary account holder or staff
    if (
      member.primaryPatientId._id.toString() !== req.user._id.toString() &&
      !['full_access', 'admin_billing'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this family member',
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error('Error fetching family member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family member',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members
 * @desc    Add family member
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      relationship,
      relationshipDetails,
      legalGuardians,
      permissions,
      address,
      emergencyContact,
      medicalInfo,
      preferences,
      sharedResources,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !relationship) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, date of birth, and relationship are required',
      });
    }

    const member = new FamilyMember({
      primaryPatientId: req.user._id,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      relationship,
      relationshipDetails,
      legalGuardians,
      permissions: permissions || {},
      address: address || {},
      emergencyContact,
      medicalInfo,
      preferences: preferences || {},
      sharedResources: sharedResources || {},
      organization: req.user.organization,
      addedBy: req.user._id,
      status: 'active',
      activatedAt: new Date(),
    });

    await member.save();

    const populated = await FamilyMember.findById(member._id).populate(
      'primaryPatientId',
      'firstName lastName'
    );

    res.status(201).json({
      success: true,
      message: 'Family member added successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add family member',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/family-members/:id
 * @desc    Update family member
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this family member',
      });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      relationship,
      relationshipDetails,
      legalGuardians,
      address,
      emergencyContact,
      medicalInfo,
      preferences,
      notes,
      tags,
    } = req.body;

    // Update fields
    if (firstName) member.firstName = firstName;
    if (lastName) member.lastName = lastName;
    if (dateOfBirth) member.dateOfBirth = dateOfBirth;
    if (gender) member.gender = gender;
    if (email !== undefined) member.email = email;
    if (phone !== undefined) member.phone = phone;
    if (relationship) member.relationship = relationship;
    if (relationshipDetails !== undefined) member.relationshipDetails = relationshipDetails;
    if (legalGuardians) member.legalGuardians = legalGuardians;
    if (address) member.address = { ...member.address, ...address };
    if (emergencyContact)
      member.emergencyContact = { ...member.emergencyContact, ...emergencyContact };
    if (medicalInfo) member.medicalInfo = { ...member.medicalInfo, ...medicalInfo };
    if (preferences) member.preferences = { ...member.preferences, ...preferences };
    if (notes !== undefined) member.notes = notes;
    if (tags) member.tags = tags;

    await member.save();

    const populated = await FamilyMember.findById(member._id)
      .populate('primaryPatientId', 'firstName lastName')
      .populate('patientId', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Family member updated successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update family member',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/family-members/:id
 * @desc    Remove family member
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this family member',
      });
    }

    const { reason } = req.body;
    await member.remove(reason || 'Removed by primary account holder');

    res.json({
      success: true,
      message: 'Family member removed successfully',
    });
  } catch (error) {
    console.error('Error removing family member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove family member',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members/:id/create-account
 * @desc    Create patient account for family member
 * @access  Private
 */
router.post('/:id/create-account', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create account for this family member',
      });
    }

    const patient = await member.createPatientAccount();

    res.status(201).json({
      success: true,
      message: 'Patient account created successfully',
      data: {
        member,
        patient,
      },
    });
  } catch (error) {
    console.error('Error creating patient account:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create patient account',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members/:id/send-invitation
 * @desc    Send invitation to family member to create their own account
 * @access  Private
 */
router.post('/:id/send-invitation', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send invitation',
      });
    }

    const token = await member.sendInvitation();

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitationToken: token,
        expiresAt: member.invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send invitation',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members/accept-invitation
 * @desc    Accept family member invitation
 * @access  Private
 */
router.post('/accept-invitation', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required',
      });
    }

    const member = await FamilyMember.findByInvitationToken(token);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation',
      });
    }

    await member.acceptInvitation(req.user._id);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept invitation',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/family-members/:id/permissions
 * @desc    Update family member permissions
 * @access  Private
 */
router.put('/:id/permissions', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update permissions',
      });
    }

    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions object is required',
      });
    }

    await member.updatePermissions(permissions);

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members/:id/consent
 * @desc    Add consent for family member
 * @access  Private
 */
router.post('/:id/consent', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add consent',
      });
    }

    const { consentType, documentUrl, expirationDate } = req.body;

    if (!consentType) {
      return res.status(400).json({
        success: false,
        message: 'Consent type is required',
      });
    }

    member.addConsent(consentType, req.user._id, documentUrl, expirationDate);
    await member.save();

    res.json({
      success: true,
      message: 'Consent added successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error adding consent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add consent',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/family-members/:id/shared-resources
 * @desc    Update shared resources (insurance, payment methods)
 * @access  Private
 */
router.put('/:id/shared-resources', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (member.primaryPatientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update shared resources',
      });
    }

    const { sharedResources } = req.body;

    if (!sharedResources) {
      return res.status(400).json({
        success: false,
        message: 'Shared resources object is required',
      });
    }

    member.sharedResources = {
      ...member.sharedResources,
      ...sharedResources,
    };

    await member.save();

    res.json({
      success: true,
      message: 'Shared resources updated successfully',
      data: member,
    });
  } catch (error) {
    console.error('Error updating shared resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shared resources',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/family-members/statistics
 * @desc    Get family statistics for authenticated user
 * @access  Private
 */
router.get('/statistics', protect, async (req, res) => {
  try {
    const stats = await FamilyMember.getFamilyStatistics(req.user._id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching family statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch family statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/family-members/:id/appointments
 * @desc    Get appointments for family member
 * @access  Private
 */
router.get('/:id/appointments', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    // Check authorization
    if (
      member.primaryPatientId.toString() !== req.user._id.toString() &&
      !['full_access', 'admin_billing'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view appointments',
      });
    }

    if (!member.patientId) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Family member does not have a patient account yet',
      });
    }

    // Note: Appointment model would need to be imported from appointments module
    // const Appointment = require('../../appointments/models/Appointment');
    const { status, startDate, endDate } = req.query;

    const query = {
      patient: member.patientId,
    };

    if (status) query.status = status;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const appointments = await Appointment.find(query)
      .populate('practitioner', 'firstName lastName')
      .populate('service', 'name duration')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/family-members/:id/update-counts
 * @desc    Update appointment counts for family member
 * @access  Private
 */
router.post('/:id/update-counts', protect, async (req, res) => {
  try {
    const member = await FamilyMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Family member not found',
      });
    }

    await member.updateAppointmentCounts();

    res.json({
      success: true,
      message: 'Appointment counts updated',
      data: {
        totalAppointments: member.totalAppointments,
        upcomingAppointments: member.upcomingAppointments,
        lastAppointment: member.lastAppointment,
      },
    });
  } catch (error) {
    console.error('Error updating appointment counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment counts',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/family-members/search
 * @desc    Search family members (staff only)
 * @access  Private (Staff)
 */
router.get('/search', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters',
      });
    }

    const members = await FamilyMember.searchMembers(req.user.organization, q);

    res.json({
      success: true,
      count: members.length,
      data: members,
    });
  } catch (error) {
    console.error('Error searching family members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search family members',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/family-members/minors-needing-consent
 * @desc    Get minors without guardian consent (staff only)
 * @access  Private (Staff)
 */
router.get(
  '/minors-needing-consent',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const minors = await FamilyMember.getMinorsNeedingConsent(req.user.organization);

      res.json({
        success: true,
        count: minors.length,
        data: minors,
      });
    } catch (error) {
      console.error('Error fetching minors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch minors needing consent',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/family-members/pending-invitations
 * @desc    Get pending invitations for authenticated user
 * @access  Private
 */
router.get('/pending-invitations', protect, async (req, res) => {
  try {
    const invitations = await FamilyMember.getPendingInvitations(req.user._id);

    res.json({
      success: true,
      count: invitations.length,
      data: invitations,
    });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending invitations',
      error: error.message,
    });
  }
});

module.exports = router;
