// Analytics Service
// Move business logic from analytics routes here

const Device = require('../models/Device');
const SecurityService = require('../services/security.service');

class ServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const getAccessAnalytics = async (req) => {
  // TODO: Implement actual logic
  return { message: 'Access analytics result (to be implemented)' };
};

const getSocialMediaAnalytics = async (req) => {
  // TODO: Implement actual logic
  return { message: 'Social media analytics result (to be implemented)' };
};

const getSecurityDashboard = async (req) => {
  // TODO: Implement actual logic
  return { message: 'Security dashboard result (to be implemented)' };
};

const getDevices = async (req) => {
  if (!req.user || !req.user._id) throw new ServiceError('User not authenticated', 401);
  const devices = await Device.find({ userId: req.user._id })
    .sort({ lastSeen: -1 })
    .select('-__v');
  return devices;
};

const trustDevice = async (req) => {
  if (!req.user || !req.user._id) throw new ServiceError('User not authenticated', 401);
  const { deviceId } = req.params;
  if (!deviceId) throw new ServiceError('Device ID is required');
  const { trusted } = req.body;
  const device = await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    {
      $set: {
        trusted: trusted === true,
        trustedAt: trusted === true ? new Date() : null,
      },
    },
    { new: true }
  );
  if (!device) throw new ServiceError('Device not found', 404);
  return device;
};

const deleteDevice = async (req) => {
  if (!req.user || !req.user._id) throw new ServiceError('User not authenticated', 401);
  const { deviceId } = req.params;
  if (!deviceId) throw new ServiceError('Device ID is required');
  const device = await Device.findOneAndDelete({
    userId: req.user._id,
    deviceId,
  });
  if (!device) throw new ServiceError('Device not found', 404);
  return { message: 'Device removed successfully' };
};

const getSecurityRecommendations = async () => {
  return SecurityService.getSecurityRecommendations();
};

const getSecurityPosture = async () => {
  return SecurityService.analyzeSecurityPosture();
};

const getSecurityImplementationGuide = async () => {
  return SecurityService.getImplementationGuide();
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
  ServiceError,
};
