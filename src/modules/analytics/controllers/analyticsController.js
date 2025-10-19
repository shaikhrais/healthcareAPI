// Analytics Controller
const analyticsService = require('../services/analyticsService');

// Example controller method for access analytics
const getAccessAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getAccessAnalytics(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Add more controller methods for each route as you migrate logic

const getSocialMediaAnalytics = async (req, res, next) => {
  try {
    const result = await analyticsService.getSocialMediaAnalytics(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSecurityDashboard = async (req, res, next) => {
  try {
    const result = await analyticsService.getSecurityDashboard(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getDevices = async (req, res, next) => {
  try {
    const result = await analyticsService.getDevices(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const trustDevice = async (req, res, next) => {
  try {
    const result = await analyticsService.trustDevice(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteDevice = async (req, res, next) => {
  try {
    const result = await analyticsService.deleteDevice(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSecurityRecommendations = async (req, res, next) => {
  try {
    const result = await analyticsService.getSecurityRecommendations(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSecurityPosture = async (req, res, next) => {
  try {
    const result = await analyticsService.getSecurityPosture(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSecurityImplementationGuide = async (req, res, next) => {
  try {
    const result = await analyticsService.getSecurityImplementationGuide(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccessAnalytics,
  getSocialMediaAnalytics,
  getSecurityDashboard,
  getDevices,
  trustDevice,
  deleteDevice,
  getSecurityRecommendations,
  getSecurityPosture,
  getSecurityImplementationGuide,
};
