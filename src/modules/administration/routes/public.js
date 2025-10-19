const express = require('express');


const Patient = require('../models/Patient');
const Treatment = require('../models/Treatment');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Shift = require('../models/Shift');
const router = express.Router();
// No authentication required for public routes

// Get available services for online booking
router.get('/services', async (req, res) => {
  try {
    const treatments = await Treatment.find({
      active: true,
      onlineBookingEnabled: true,
    })
      .select('name description category price duration color')
      .sort({ category: 1, name: 1 });

    res.json(treatments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available practitioners for a service
router.get('/practitioners', async (req, res) => {
  try {
    const { treatmentId } = req.query;

    const filter = {
      role: { $in: ['practitioner_frontdesk', 'practitioner_limited'] },
      active: true,
    };

    // If treatment specified, filter by practitioners who offer it
    if (treatmentId) {
      const treatment = await Treatment.findById(treatmentId);
      if (treatment && treatment.availableFor && treatment.availableFor.length > 0) {
        filter._id = { $in: treatment.availableFor };
      }
    }

    const practitioners = await User.find(filter)
      .select('firstName lastName email services avatar bio')
      .sort({ lastName: 1, firstName: 1 });

    res.json(practitioners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available dates for a practitioner (next 30 days with availability)
router.get('/available-dates', async (req, res) => {
  try {
    const { practitionerId, duration = 30 } = req.query;

    if (!practitionerId) {
      return res.status(400).json({ error: 'Practitioner ID required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Get all shifts for this practitioner in next 30 days
    const shifts = await Shift.find({
      practitioner: practitionerId,
      date: { $gte: today, $lte: thirtyDaysLater },
      status: 'scheduled',
      bookable: true,
    }).sort({ date: 1 });

    const availableDates = [];

    for (const shift of shifts) {
      // Get appointments for this date
      const startOfDay = new Date(shift.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(shift.date);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await Appointment.find({
        practitioner: practitionerId,
        startTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['cancelled', 'no-show'] },
      });

      // Get available slots
      const allSlots = shift.getAvailableSlots(parseInt(duration, 10));

      // Filter occupied slots
      const availableSlots = allSlots.filter((slotTime) => {
        const slotDateTime = new Date(shift.date);
        const [hours, minutes] = slotTime.split(':').map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);
        const slotEnd = new Date(slotDateTime.getTime() + parseInt(duration, 10) * 60000);

        for (const apt of appointments) {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);

          if (
            (slotDateTime >= aptStart && slotDateTime < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotDateTime <= aptStart && slotEnd >= aptEnd)
          ) {
            return false;
          }
        }
        return true;
      });

      if (availableSlots.length > 0) {
        availableDates.push({
          date: shift.date,
          slotsAvailable: availableSlots.length,
        });
      }
    }

    res.json(availableDates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available time slots for a specific date
router.get('/available-slots', async (req, res) => {
  try {
    const { practitionerId, date, duration = 30 } = req.query;

    if (!practitionerId || !date) {
      return res.status(400).json({ error: 'Practitioner ID and date required' });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const shift = await Shift.findOne({
      practitioner: practitionerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'scheduled',
      bookable: true,
    });

    if (!shift) {
      return res.json({ slots: [] });
    }

    const appointments = await Appointment.find({
      practitioner: practitionerId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'no-show'] },
    });

    const allSlots = shift.getAvailableSlots(parseInt(duration, 10));

    const availableSlots = allSlots.filter((slotTime) => {
      const slotDateTime = new Date(shift.date);
      const [hours, minutes] = slotTime.split(':').map(Number);
      slotDateTime.setHours(hours, minutes, 0, 0);
      const slotEnd = new Date(slotDateTime.getTime() + parseInt(duration, 10) * 60000);

      for (const apt of appointments) {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);

        if (
          (slotDateTime >= aptStart && slotDateTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotDateTime <= aptStart && slotEnd >= aptEnd)
        ) {
          return false;
        }
      }
      return true;
    });

    res.json({
      date: shift.date,
      slots: availableSlots,
      shift: {
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick patient registration for online booking
router.post('/register-patient', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth } = req.body;

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ error: 'Patient with this email already exists' });
    }

    const patient = new Patient({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      active: true,
    });

    await patient.save();

    res.status(201).json({
      id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create booking (public)
router.post('/book', async (req, res) => {
  try {
    const { patientId, practitionerId, treatmentId, startTime, duration, notes } = req.body;

    // Validate availability
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    // Check shift exists
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(start);
    endOfDay.setHours(23, 59, 59, 999);

    const shift = await Shift.findOne({
      practitioner: practitionerId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'scheduled',
      bookable: true,
    });

    if (!shift) {
      return res.status(400).json({ error: 'No availability at this time' });
    }

    // Check for conflicts
    const conflicts = await Appointment.find({
      practitioner: practitionerId,
      status: { $nin: ['cancelled', 'no-show'] },
      $or: [
        { startTime: { $lt: end, $gte: start } },
        { endTime: { $gt: start, $lte: end } },
        { startTime: { $lte: start }, endTime: { $gte: end } },
      ],
    });

    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Time slot no longer available' });
    }

    // Get treatment info
    const treatment = await Treatment.findById(treatmentId);

    // Create appointment
    const appointment = new Appointment({
      patient: patientId,
      practitioner: practitionerId,
      treatment: treatmentId,
      startTime: start,
      endTime: end,
      duration,
      notes,
      status: 'scheduled',
      appointmentType: treatment?.category || 'General',
      bookedVia: 'online',
    });

    await appointment.save();
    await appointment.populate('patient practitioner treatment');

    res.status(201).json({
      id: appointment._id,
      confirmationNumber: appointment._id.toString().slice(-8).toUpperCase(),
      appointment,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get booking confirmation
router.get('/booking/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone')
      .populate('practitioner', 'firstName lastName')
      .populate('treatment', 'name duration price');

    if (!appointment) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      confirmationNumber: appointment._id.toString().slice(-8).toUpperCase(),
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel booking (public - requires confirmation number)
router.post('/booking/:id/cancel', async (req, res) => {
  try {
    const { email } = req.body;

    const appointment = await Appointment.findById(req.params.id).populate('patient', 'email');

    if (!appointment) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify email matches
    if (appointment.patient.email !== email) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Check if cancellation is allowed (e.g., at least 24 hours notice)
    const hoursUntilAppointment = (new Date(appointment.startTime) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilAppointment < 24) {
      return res.status(400).json({ error: 'Cancellations require 24 hours notice' });
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = 'Patient cancelled online';
    await appointment.save();

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
