// Service layer for patient business logic
const Patient = require('../models/Patient');
// Note: Appointment model would need to be imported from appointments module
// const Appointment = require('../../appointments/models/Appointment');

const searchPatients = async (q) => {
  if (!q || q.length < 2) return [];
  return Patient.find({
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ],
    active: true,
  })
    .select('firstName lastName email phone dateOfBirth')
    .limit(10)
    .sort({ lastName: 1, firstName: 1 });
};

const getAllPatients = async (search, active, limit = 50, skip = 0) => {
  const filter = {};
  if (active !== undefined) filter.active = active === 'true';
  let query = Patient.find(filter);
  if (search) {
    query = Patient.find({
      ...filter,
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    });
  }
  const patients = await query
    .populate('assignedPractitioner', 'firstName lastName')
    .sort({ lastName: 1, firstName: 1 })
    .limit(parseInt(limit, 10))
    .skip(parseInt(skip, 10));
  const total = await Patient.countDocuments(filter);
  return { patients, total, limit: parseInt(limit, 10), skip: parseInt(skip, 10) };
};

const createPatient = async (data) => {
  const patient = new Patient(data);
  await patient.save();
  return patient;
};

const getPatientById = async (id) => {
  return Patient.findById(id).populate('assignedPractitioner');
};

const updatePatient = async (id, data) => {
  return Patient.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate('assignedPractitioner', 'firstName lastName');
};

const softDeletePatient = async (id) => {
  return Patient.findByIdAndUpdate(id, { active: false }, { new: true });
};

const getPatientAppointments = async (id) => {
  return Appointment.find({ patient: id })
    .populate('practitioner', 'firstName lastName')
    .populate('treatment', 'name duration price')
    .sort({ startTime: -1 })
    .limit(50);
};

module.exports = {
  searchPatients,
  getAllPatients,
  createPatient,
  getPatientById,
  updatePatient,
  softDeletePatient,
  getPatientAppointments,
};
