const patientService = require('../services/patientService');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    const patients = await patientService.searchPatients(q);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { search, active, limit = 50, skip = 0 } = req.query;
    const result = await patientService.getAllPatients(search, active, limit, skip);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const patient = await patientService.createPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const patient = await patientService.softDeletePatient(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deactivated successfully', patient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await patientService.getPatientAppointments(req.params.id);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
