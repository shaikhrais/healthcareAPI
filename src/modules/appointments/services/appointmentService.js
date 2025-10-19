// Service layer for appointment business logic
const Appointment = require('../models/Appointment');
const Patient = require('../../patients/models/Patient');
const User = require('../../auth/models/User');
const Treatment = require('../../clinical/models/Treatment');

const getAllAppointments = async (query) => {
  const { date, practitioner, patient, status } = query;
  const filter = {};
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    filter.startTime = { $gte: startOfDay, $lte: endOfDay };
  }
  if (practitioner) filter.practitioner = practitioner;
  if (patient) filter.patient = patient;
  if (status) filter.status = status;
  return Appointment.find(filter)
    .populate('patient', 'firstName lastName email phone')
    .populate('practitioner', 'firstName lastName email services')
    .sort({ startTime: 1 });
};

const getAppointmentById = async (id) => {
  return Appointment.findById(id)
    .populate('patient')
    .populate('practitioner')
    .populate('createdBy', 'firstName lastName');
};

const createAppointment = async (data, user) => {
  if (data.patient) {
    const patient = await Patient.findById(data.patient);
    if (!patient) throw new Error('Patient not found');
  }
  if (data.practitioner) {
    const practitioner = await User.findById(data.practitioner);
    if (!practitioner) throw new Error('Practitioner not found');
  }
  if (data.treatment) {
    const treatment = await Treatment.findById(data.treatment);
    if (!treatment) throw new Error('Treatment not found');
  }
  const appointment = new Appointment({
    ...data,
    createdBy: user._id,
    bookedBy: user._id,
    bookedVia: data.bookedVia || 'admin',
  });
  await appointment.save();
  await appointment.populate('patient practitioner treatment bookedBy');
  return appointment;
};

const updateAppointment = async (id, data) => {
  return Appointment.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('patient practitioner');
};

const deleteAppointment = async (id) => {
  return Appointment.findByIdAndDelete(id);
};

const changeStatus = async (id, status, reason, user) => {
  const update = { status };
  if (status === 'cancelled') {
    update.cancelledAt = new Date();
    update.cancelledBy = user._id;
    if (reason) update.cancellationReason = reason;
  }
  return Appointment.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate('patient practitioner treatment');
};

const checkAvailability = async (body, user) => {
  const { practitioner, startTime, duration, excludeAppointmentId } = body;
  if (!practitioner || !startTime || !duration) throw new Error('Missing required fields');
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);
  const Shift = require('../models/Shift');
  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(start);
  endOfDay.setHours(23, 59, 59, 999);
  const shift = await Shift.findOne({
    practitioner,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'scheduled',
    bookable: true,
  });
  if (!shift) return { available: false, reason: 'No shift scheduled for this practitioner at this time' };
  const timeStr = start.toTimeString().substring(0, 5);
  if (timeStr < shift.startTime || timeStr >= shift.endTime) {
    return { available: false, reason: 'Time is outside practitioner shift hours' };
  }
  if (!shift.isTimeAvailable(timeStr)) {
    return { available: false, reason: 'Time conflicts with practitioner break' };
  }
  const conflictFilter = {
    practitioner,
    status: { $nin: ['cancelled', 'no-show'] },
    $or: [
      { startTime: { $lt: end, $gte: start } },
      { endTime: { $gt: start, $lte: end } },
      { startTime: { $lte: start }, endTime: { $gte: end } },
    ],
  };
  if (excludeAppointmentId) conflictFilter._id = { $ne: excludeAppointmentId };
  const conflicts = await Appointment.find(conflictFilter);
  if (conflicts.length > 0) {
    return {
      available: false,
      reason: 'Time conflicts with existing appointment',
      conflicts: conflicts.map((apt) => ({ id: apt._id, startTime: apt.startTime, endTime: apt.endTime })),
    };
  }
  return {
    available: true,
    shift: { id: shift._id, startTime: shift.startTime, endTime: shift.endTime },
  };
};

const getAvailableSlots = async (query) => {
  const { practitioner, date, duration = 30 } = query;
  if (!practitioner || !date) throw new Error('Missing required parameters');
  const Shift = require('../models/Shift');
  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
  const shift = await Shift.findOne({
    practitioner,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'scheduled',
    bookable: true,
  });
  if (!shift) return { slots: [] };
  const allSlots = shift.getAvailableSlots(parseInt(duration, 10));
  const appointments = await Appointment.find({
    practitioner,
    startTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'no-show'] },
  });
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
  return {
    date: shift.date,
    slots: availableSlots,
    shift: { startTime: shift.startTime, endTime: shift.endTime },
  };
};

const getScheduleRange = async (query) => {
  const { startDate, endDate, practitioner } = query;
  const filter = {
    startTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };
  if (practitioner) filter.practitioner = practitioner;
  return Appointment.find(filter)
    .populate('patient', 'firstName lastName')
    .populate('practitioner', 'firstName lastName')
    .sort({ startTime: 1 });
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  changeStatus,
  checkAvailability,
  getAvailableSlots,
  getScheduleRange,
};
