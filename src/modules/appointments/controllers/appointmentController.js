const appointmentService = require('../services/appointmentService');

exports.getAll = async (req, res) => {
  try {
    const appointments = await appointmentService.getAllAppointments(req.query);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment(req.body, req.user);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const appointment = await appointmentService.deleteAppointment(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const appointment = await appointmentService.changeStatus(req.params.id, status, reason, req.user);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const result = await appointmentService.checkAvailability(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const result = await appointmentService.getAvailableSlots(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getScheduleRange = async (req, res) => {
  try {
    const appointments = await appointmentService.getScheduleRange(req.query);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
