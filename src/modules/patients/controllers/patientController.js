
// Import managers for cross-cutting concerns
const { ErrorManager, ConfigManager, CacheManager, RequestContextManager } = require('../../../shared/managers');
const patientService = require('../services/patientService');


exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    // Example: Use cache for search results (short TTL)
    const cacheKey = `patients:search:${q}`;
    const patients = await CacheManager.remember(cacheKey, 10_000, () => patientService.searchPatients(q));
    res.json(patients);
  } catch (error) {
    next(error);
  }
};


exports.getAll = async (req, res, next) => {
  try {
    const { search, active, limit = 50, skip = 0 } = req.query;
    // Example: Use config manager for default limit
    const defaultLimit = ConfigManager.features.enableAnalytics ? 100 : 50;
    const result = await patientService.getAllPatients(search, active, limit || defaultLimit, skip);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


exports.create = async (req, res, next) => {
  try {
    const patient = await patientService.createPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    // Example: Use ErrorManager for validation errors
    next(new ErrorManager.ValidationError(error.message));
  }
};


exports.getById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    if (!patient) throw new ErrorManager.NotFoundError('Patient not found');
    // Example: Access per-request context
    const ctx = RequestContextManager.get();
    res.json({ patient, correlationId: ctx?.correlationId });
  } catch (error) {
    next(error);
  }
};


exports.update = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    if (!patient) throw new ErrorManager.NotFoundError('Patient not found');
    res.json(patient);
  } catch (error) {
    next(error);
  }
};


exports.softDelete = async (req, res, next) => {
  try {
    const patient = await patientService.softDeletePatient(req.params.id);
    if (!patient) throw new ErrorManager.NotFoundError('Patient not found');
    res.json({ message: 'Patient deactivated successfully', patient });
  } catch (error) {
    next(error);
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
