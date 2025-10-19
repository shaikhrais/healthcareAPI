const express = require('express');


const Shift = require('../models/Shift');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

// Get shifts with filters
router.get('/', async (req, res) => {
  try {
    const { practitioner, date, startDate, endDate, status } = req.query;
    const filter = {};

    if (practitioner) filter.practitioner = practitioner;
    if (status) filter.status = status;

    // Date filtering
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const shifts = await Shift.find(filter)
      .populate('practitioner', 'firstName lastName email services role')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single shift
router.get('/:id', async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id)
      .populate('practitioner', 'firstName lastName email services')
      .populate('createdBy', 'firstName lastName');

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create shift
router.post('/', async (req, res) => {
  try {
    const shift = new Shift({
      ...req.body,
      createdBy: req.user._id,
    });

    await shift.save();
    await shift.populate('practitioner', 'firstName lastName');

    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create recurring shifts
router.post('/recurring', async (req, res) => {
  try {
    const {
      practitioner,
      startTime,
      endTime,
      breaks,
      location,
      recurrencePattern,
      bufferBefore,
      bufferAfter,
      notes,
    } = req.body;

    if (!recurrencePattern || !recurrencePattern.daysOfWeek || !recurrencePattern.endDate) {
      return res.status(400).json({ error: 'Invalid recurrence pattern' });
    }

    const shifts = [];
    const startDate = new Date();
    const endDate = new Date(recurrencePattern.endDate);
    const exceptions = new Set(
      recurrencePattern.exceptions?.map((d) => new Date(d).toISOString().split('T')[0]) || []
    );

    // Create parent shift
    const parentShift = new Shift({
      practitioner,
      date: startDate,
      startTime,
      endTime,
      breaks,
      location,
      isRecurring: true,
      recurrencePattern,
      bufferBefore,
      bufferAfter,
      notes,
      createdBy: req.user._id,
    });
    await parentShift.save();

    // Generate shifts for each occurrence
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];

      if (recurrencePattern.daysOfWeek.includes(dayOfWeek) && !exceptions.has(dateStr)) {
        const shift = new Shift({
          practitioner,
          date: new Date(currentDate),
          startTime,
          endTime,
          breaks,
          location,
          isRecurring: true,
          recurringParent: parentShift._id,
          bufferBefore,
          bufferAfter,
          notes,
          createdBy: req.user._id,
        });

        await shift.save();
        shifts.push(shift);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(201).json({
      message: `Created ${shifts.length} recurring shifts`,
      parentShift,
      count: shifts.length,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update shift
router.put('/:id', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('practitioner', 'firstName lastName');

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(shift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel shift
router.patch('/:id/cancel', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    ).populate('practitioner', 'firstName lastName');

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(shift);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete shift
router.delete('/:id', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available time slots for a shift
router.get('/:id/slots', async (req, res) => {
  try {
    const { duration = 30 } = req.query;
    const shift = await Shift.findById(req.params.id);

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const slots = shift.getAvailableSlots(parseInt(duration, 10));
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get practitioner's shifts for a date range
router.get('/practitioner/:practitionerId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {
      practitioner: req.params.practitionerId,
      status: { $ne: 'cancelled' },
    };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const shifts = await Shift.find(filter).sort({ date: 1, startTime: 1 });

    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
