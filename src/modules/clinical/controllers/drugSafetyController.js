// controllers/drugSafetyController.js
// Handles business logic for drug safety endpoints

const DrugInteraction = require('../models/DrugInteraction');
const Patient = require('../../patients/models/Patient');
const ErrorManager = require('../../../shared/managers/ErrorManager');

exports.checkInteraction = async (req, res, next) => {
  try {
    const { medications } = req.body;
    if (!Array.isArray(medications) || medications.length < 2) {
      throw new ValidationError('At least two medications are required');
    }
    const interactions = await DrugInteraction.checkInteractions(medications);
    res.json({ interactions });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'checkInteraction' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.checkAllergies = async (req, res, next) => {
  try {
    const { patientId, medication } = req.body;
    if (!patientId || !medication) {
      throw new ValidationError('patientId and medication are required');
    }
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new ValidationError('Patient not found');
    }
    const allergies = patient.medicalHistory?.allergies || [];
    const allergic = allergies.some(a => a.toLowerCase() === medication.toLowerCase());
    res.json({ allergic, allergies });
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'checkAllergies' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.comprehensiveCheck = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.checkAllMedications = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.getInteractions = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.addInteraction = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.getAllergies = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.addAllergy = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.getStats = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};

exports.seedDatabase = (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
};
