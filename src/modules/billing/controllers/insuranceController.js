// Insurance Controller
const insuranceService = require('../services/insuranceService');
const { validationResult } = require('express-validator');

const getAllInsurances = async (req, res, next) => {
  try {
    const result = await insuranceService.getAllInsurances(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const createInsurance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const result = await insuranceService.createInsurance(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const updateInsurance = async (req, res, next) => {
  try {
    const result = await insuranceService.updateInsurance(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const verifyEligibility = async (req, res, next) => {
  try {
    const result = await insuranceService.verifyEligibility(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const batchVerifyInsurances = async (req, res, next) => {
  try {
    const result = await insuranceService.batchVerifyInsurances();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getPatientInsurances = async (req, res, next) => {
  try {
    const result = await insuranceService.getPatientInsurances(req.params.patientId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getPatientInsuranceSummary = async (req, res, next) => {
  try {
    const result = await insuranceService.getPatientInsuranceSummary(req.params.patientId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getExpiringSoon = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const result = await insuranceService.getExpiringSoon(days);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getNeedingVerification = async (req, res, next) => {
  try {
    const result = await insuranceService.getNeedingVerification();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Claims
const createClaim = async (req, res, next) => {
  try {
    const result = await insuranceService.createClaim(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const submitClaim = async (req, res, next) => {
  try {
    const result = await insuranceService.submitClaim(req.params.id, req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const checkClaimStatus = async (req, res, next) => {
  try {
    const result = await insuranceService.checkClaimStatus(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const batchCheckClaimStatus = async (req, res, next) => {
  try {
    const result = await insuranceService.batchCheckClaimStatus();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const processClaimPayment = async (req, res, next) => {
  try {
    const result = await insuranceService.processClaimPayment(req.params.id, {
      ...req.body,
      processedBy: req.user._id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const appealClaim = async (req, res, next) => {
  try {
    const result = await insuranceService.appealClaim(req.params.id, {
      reason: req.body.reason,
      userId: req.user._id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getPendingClaims = async (req, res, next) => {
  try {
    const result = await insuranceService.getPendingClaims();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getOverdueClaims = async (req, res, next) => {
  try {
    const result = await insuranceService.getOverdueClaims();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getDeniedClaims = async (req, res, next) => {
  try {
    const result = await insuranceService.getDeniedClaims();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getPatientClaims = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await insuranceService.getPatientClaims(req.params.patientId, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getInsuranceAnalytics = async (req, res, next) => {
  try {
    const result = await insuranceService.getInsuranceAnalytics(
      new Date(req.query.startDate),
      new Date(req.query.endDate)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getInsuranceById = async (req, res, next) => {
  try {
    const result = await insuranceService.getInsuranceById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllInsurances,
  createInsurance,
  updateInsurance,
  verifyEligibility,
  batchVerifyInsurances,
  getPatientInsurances,
  getPatientInsuranceSummary,
  getExpiringSoon,
  getNeedingVerification,
  createClaim,
  submitClaim,
  checkClaimStatus,
  batchCheckClaimStatus,
  processClaimPayment,
  appealClaim,
  getPendingClaims,
  getOverdueClaims,
  getDeniedClaims,
  getPatientClaims,
  getInsuranceAnalytics,
  getInsuranceById,
};
