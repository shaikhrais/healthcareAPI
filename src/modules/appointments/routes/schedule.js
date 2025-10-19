const express = require('express');

const Appointment = require('../models/Appointment');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const router = express.Router();
router.use(authMiddleware);

// Get schedule for a specific date
router.get('/', async (req, res) => {
  try {
    const { date, practitionerId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      startTime: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    if (practitionerId) {
      filter.practitioner = practitionerId;
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName phone')
      .populate('practitioner', 'firstName lastName services role permissions')
      .sort({ startTime: 1 });

    // Group by practitioner
    const schedule = {};
    appointments.forEach((apt) => {
      const practId = apt.practitioner._id.toString();
      if (!schedule[practId]) {
        schedule[practId] = {
          practitioner: apt.practitioner,
          appointments: [],
        };
      }
      schedule[practId].appointments.push(apt);
    });

    res.json({
      date,
      schedule: Object.values(schedule),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
