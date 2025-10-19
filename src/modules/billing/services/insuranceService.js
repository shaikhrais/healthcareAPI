// Insurance Service
const Insurance = require('../models/Insurance');
const InsuranceClaim = require('../models/InsuranceClaim');
const InsuranceServiceLib = require('../services/insurance.service');

const getAllInsurances = async (query) => {
  const limit = parseInt(query.limit, 10) || 50;
  const filters = {};
  if (query.status) filters.status = query.status;
  const insurances = await Insurance.find(filters)
    .populate('patientId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
  return insurances;
};

const createInsurance = async (body) => {
  const insurance = await Insurance.create(body);
  return insurance;
};

const updateInsurance = async (id, body) => {
  const insurance = await Insurance.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!insurance) throw new Error('Insurance not found');
  return insurance;
};

const verifyEligibility = async (id) => {
  return InsuranceServiceLib.verifyEligibility(id);
};

const batchVerifyInsurances = async () => {
  return InsuranceServiceLib.batchVerifyInsurances();
};

const getPatientInsurances = async (patientId) => {
  return Insurance.getActiveInsurances(patientId);
};

const getPatientInsuranceSummary = async (patientId) => {
  return InsuranceServiceLib.getPatientInsuranceSummary(patientId);
};

const getExpiringSoon = async (days) => {
  return Insurance.getExpiringSoon(days);
};

const getNeedingVerification = async () => {
  return Insurance.getNeedingVerification();
};

// Claims
const createClaim = async (body) => {
  return InsuranceServiceLib.createClaim(body);
};

const submitClaim = async (id, userId) => {
  return InsuranceServiceLib.submitClaim(id, userId);
};

const checkClaimStatus = async (id) => {
  return InsuranceServiceLib.checkClaimStatus(id);
};

const batchCheckClaimStatus = async () => {
  return InsuranceServiceLib.batchCheckClaimStatus();
};

const processClaimPayment = async (id, paymentData) => {
  return InsuranceServiceLib.processClaimPayment(id, paymentData);
};

const appealClaim = async (id, data) => {
  return InsuranceServiceLib.appealClaim(id, data);
};

const getPendingClaims = async () => {
  return InsuranceClaim.getPendingClaims();
};

const getOverdueClaims = async () => {
  return InsuranceClaim.getOverdueClaims();
};

const getDeniedClaims = async () => {
  return InsuranceClaim.getDeniedClaims();
};

const getPatientClaims = async (patientId, limit) => {
  return InsuranceClaim.getPatientClaims(patientId, limit);
};

const getInsuranceAnalytics = async (startDate, endDate) => {
  return InsuranceServiceLib.getInsuranceAnalytics(startDate, endDate);
};

const getInsuranceById = async (id) => {
  return Insurance.findById(id).populate('patientId', 'firstName lastName');
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
