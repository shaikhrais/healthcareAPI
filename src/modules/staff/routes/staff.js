const express = require('express');

const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     StaffMember:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Staff member ID
 *         firstName:
 *           type: string
 *           example: "Dr. Sarah"
 *         lastName:
 *           type: string
 *           example: "Johnson"
 *         email:
 *           type: string
 *           format: email
 *           example: "dr.johnson@healthcare.com"
 *         role:
 *           type: string
 *           enum: [practitioner_limited, practitioner_full, admin_billing, full_access]
 *           example: "practitioner_full"
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         active:
 *           type: boolean
 *           example: true
 *         services:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Physiotherapy", "Sports Medicine"]
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Orthopedic", "Neurological"]
 *         qualifications:
 *           type: array
 *           items:
 *             type: string
 *           example: ["DPT", "Licensed Physiotherapist"]
 *         schedule:
 *           type: object
 *           description: Staff member's weekly schedule
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: Get all staff members
 *     description: Retrieve a list of all staff members with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [practitioner_limited, practitioner_full, admin_billing, full_access]
 *         description: Filter by staff role
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Staff members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StaffMember'
 *       500:
 *         description: Failed to retrieve staff members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { role, active } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';

    const staff = await User.find(filter).select('-password').sort({ lastName: 1, firstName: 1 });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     tags: [Staff]
 *     summary: Get a specific staff member
 *     description: Retrieve detailed information about a specific staff member
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff member ID
 *     responses:
 *       200:
 *         description: Staff member retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffMember'
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to retrieve staff member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const staff = await User.findById(req.params.id).select('-password');

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff member services
router.put('/:id/services', async (req, res) => {
  try {
    const { services } = req.body;

    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { services },
      { new: true, runValidators: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
