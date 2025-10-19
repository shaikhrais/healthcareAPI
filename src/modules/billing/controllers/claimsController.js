// Claims Controller
const claimService = require('../services/claimsService');
const { validationResult } = require('express-validator');

const createClaim = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const result = await claimService.createClaim(req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const getAllClaims = async (req, res, next) => {
  try {
    const result = await claimService.getAllClaims(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getClaimById = async (req, res, next) => {
  try {
    const result = await claimService.getClaimById(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateClaim = async (req, res, next) => {
  try {
    const result = await claimService.updateClaim(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteClaim = async (req, res, next) => {
  try {
    const result = await claimService.deleteClaim(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const scrubClaim = async (req, res, next) => {
  try {
    const result = await claimService.scrubClaim(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const autoFixClaim = async (req, res, next) => {
  try {
    const result = await claimService.autoFixClaim(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getScrubReports = async (req, res, next) => {
  try {
    const result = await claimService.getScrubReports(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getLatestScrubReport = async (req, res, next) => {
  try {
    const result = await claimService.getLatestScrubReport(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const submitClaim = async (req, res, next) => {
  try {
    const result = await claimService.submitClaim(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const resubmitClaim = async (req, res, next) => {
  try {
    const result = await claimService.resubmitClaim(req.params.id, req.body, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const getStatsOverview = async (req, res, next) => {
  try {
    const result = await claimService.getStatsOverview(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const batchScrubClaims = async (req, res, next) => {
  try {
    const result = await claimService.batchScrubClaims(req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClaim,
  getAllClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
  scrubClaim,
  autoFixClaim,
  getScrubReports,
  getLatestScrubReport,
  submitClaim,
  resubmitClaim,
  getStatsOverview,
  batchScrubClaims,
};
