const express = require('express');

const Waitlist = require('../models/Waitlist');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

// Get waitlist entries
router.get('/', async (req, res) => {
  try {
    const { patient, practitioner, treatment, status } = req.query;
    const filter = {};

    if (patient) filter.patient = patient;
    if (practitioner) filter.practitioner = practitioner;
    if (treatment) filter.treatment = treatment;
    if (status) filter.status = status;

    const entries = await Waitlist.find(filter)
      .populate('patient', 'firstName lastName phone email')
      .populate('practitioner', 'firstName lastName')
      .populate('treatment', 'name duration')
      .sort({ priority: -1, createdAt: 1 });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single waitlist entry
router.get('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findById(req.params.id)
      .populate('patient', 'firstName lastName phone email')
      .populate('practitioner', 'firstName lastName')
      .populate('treatment', 'name duration price');

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to waitlist
router.post('/', async (req, res) => {
  try {
    const entry = new Waitlist(req.body);
    await entry.save();
    await entry.populate('patient practitioner treatment');

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update waitlist entry
router.put('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('patient practitioner treatment');

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const entry = await Waitlist.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('patient practitioner treatment');

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark as notified
router.patch('/:id/notify', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndUpdate(
      req.params.id,
      {
        notified: true,
        status: 'contacted',
        lastNotified: new Date(),
      },
      { new: true }
    ).populate('patient practitioner treatment');

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    // TODO: Send notification (SMS/Email) to patient
    // This would integrate with communication service when implemented

    res.json(entry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete waitlist entry
router.delete('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    res.json({ message: 'Waitlist entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find matching slots for waitlist entry
router.get('/:id/matching-slots', async (req, res) => {
  try {
    const entry = await Waitlist.findById(req.params.id).populate('treatment');

    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    const Shift = require('../models/Shift');
    const Appointment = require('../models/Appointment');

    // Get future shifts for the practitioner (or all practitioners if not specified)
    const shiftFilter = {
      date: { $gte: new Date() },
      status: 'scheduled',
      bookable: true,
    };

    if (entry.practitioner) {
      shiftFilter.practitioner = entry.practitioner;
    }

    if (entry.preferredDays && entry.preferredDays.length > 0) {
      // This would need to be calculated based on the date's day of week
      // For simplicity, we'll get all shifts and filter in code
    }

    const shifts = await Shift.find(shiftFilter)
      .populate('practitioner', 'firstName lastName')
      .limit(30); // Next 30 shifts

    const matchingSlots = [];

    for (const shift of shifts) {
      const dayOfWeek = shift.date.getDay();

      // Check if day matches preference
      if (entry.preferredDays && entry.preferredDays.length > 0) {
        if (!entry.preferredDays.includes(dayOfWeek)) {
          continue;
        }
      }

      // Get available slots for this shift
      const duration = entry.treatment?.duration || 30;
      const allSlots = shift.getAvailableSlots(duration);

      // Filter by time of day preference
      const filteredSlots = allSlots.filter((slot) => {
        if (!entry.preferredTimeOfDay || entry.preferredTimeOfDay === 'any') {
          return true;
        }

        const [hours] = slot.split(':').map(Number);
        if (entry.preferredTimeOfDay === 'morning' && hours >= 6 && hours < 12) return true;
        if (entry.preferredTimeOfDay === 'afternoon' && hours >= 12 && hours < 17) return true;
        if (entry.preferredTimeOfDay === 'evening' && hours >= 17 && hours < 21) return true;

        return false;
      });

      // Check each slot against existing appointments
      for (const slotTime of filteredSlots) {
        const slotDateTime = new Date(shift.date);
        const [hours, minutes] = slotTime.split(':').map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);
        const slotEnd = new Date(slotDateTime.getTime() + duration * 60000);

        const conflicts = await Appointment.find({
          practitioner: shift.practitioner._id,
          status: { $nin: ['cancelled', 'no-show'] },
          $or: [
            { startTime: { $lt: slotEnd, $gte: slotDateTime } },
            { endTime: { $gt: slotDateTime, $lte: slotEnd } },
            { startTime: { $lte: slotDateTime }, endTime: { $gte: slotEnd } },
          ],
        });

        if (conflicts.length === 0) {
          matchingSlots.push({
            date: shift.date,
            time: slotTime,
            datetime: slotDateTime,
            practitioner: shift.practitioner,
            shift: shift._id,
          });
        }
      }

      // Limit results
      if (matchingSlots.length >= 20) break;
    }

    res.json({
      entry: {
        id: entry._id,
        patient: entry.patient,
        treatment: entry.treatment,
        preferences: {
          days: entry.preferredDays,
          timeOfDay: entry.preferredTimeOfDay,
        },
      },
      matchingSlots,
      count: matchingSlots.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
