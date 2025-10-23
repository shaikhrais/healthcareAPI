// controllers/clinicalNotesController.js
// Handles business logic for clinical notes

const ClinicalNote = require('../models/ClinicalNote');
const ErrorManager = require('../../../shared/managers/ErrorManager');

exports.getAllClinicalNotes = async (req, res, next) => {
  try {
    // Optionally filter by patientId, practitionerId, status, etc.
    const filter = {};
    if (req.query.patientId) filter.patientId = req.query.patientId;
    if (req.query.practitionerId) filter.practitionerId = req.query.practitionerId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.noteType) filter.noteType = req.query.noteType;

    const notes = await ClinicalNote.find(filter)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .populate('appointmentId', 'date time');
    res.json(notes);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'getAllClinicalNotes' });
    next(ErrorManager.toHttp(error).body);
  }
};

exports.createClinicalNote = async (req, res, next) => {
  try {
    const data = req.body;
    // Basic validation
    if (!data.patientId || !data.practitionerId || !data.noteType) {
      throw new ValidationError('Missing required fields: patientId, practitionerId, noteType');
    }
    const note = new ClinicalNote(data);
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    ErrorManager.log(error, { endpoint: 'createClinicalNote' });
    next(ErrorManager.toHttp(error).body);
  }
};

// Add more controller methods for update, delete, etc. as needed
