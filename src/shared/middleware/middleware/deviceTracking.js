
const Device = require('../models/Device');
const { extractDeviceData, isSuspiciousDevice } = require('../utils/deviceDetection');
const { sendNewDeviceAlert } = require('../utils/emailService');
/**
 * Device Tracking Middleware
 * Tracks user devices and sends alerts for new device logins
 */

/**
 * Track device after successful login
 * Should be called after authentication but before sending response
 */
async function trackDeviceLogin(req, res, next) {
  try {
    // Skip if not authenticated or no user
    if (!req.user || !req.user._id) {
      return next();
    }

    // Extract device data from request
    const deviceData = await extractDeviceData(req);

    // Find or create device
    const { device, isNew } = await Device.findOrCreateDevice(req.user._id, deviceData);

    // Check if device is suspicious
    const suspiciousCheck = isSuspiciousDevice(deviceData, req.user);
    if (suspiciousCheck.isSuspicious) {
      console.warn('⚠️ Suspicious device detected:', {
        userId: req.user._id,
        deviceId: device._id,
        reasons: suspiciousCheck.reasons,
        ip: deviceData.ipAddress,
      });

      // Log suspicious activity
      // In production, you might want to store this in a separate SecurityLog model
      device.isTrusted = false;
      await device.save();
    }

    // If this is a new device, send email alert
    if (isNew && !device.notificationSent) {
      console.log('📧 New device detected, sending alert email...');

      // Send email asynchronously (don't block the login)
      sendNewDeviceAlert(req.user, device)
        .then((result) => {
          if (result.success) {
            device.notificationSent = true;
            device.save().catch((err) => {
              console.error('Error updating device notification status:', err);
            });
          }
        })
        .catch((err) => {
          console.error('Error sending new device alert:', err);
        });
    }

    // Attach device info to request for use in response
    req.deviceInfo = {
      deviceId: device._id,
      isNew,
      isSuspicious: suspiciousCheck.isSuspicious,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      location: device.location,
    };

    next();
  } catch (error) {
    console.error('Error in device tracking middleware:', error);
    // Don't fail the login if device tracking fails
    next();
  }
}

/**
 * Get user's registered devices
 */
async function getUserDevices(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const devices = await Device.getUserDevices(req.user._id);

    // Format devices for response
    const formattedDevices = devices.map((device) => ({
      id: device._id,
      deviceType: device.deviceType,
      deviceName: device.deviceName,
      platform: device.platform,
      browser: device.browser,
      location: device.location,
      firstSeen: device.firstSeen,
      lastSeen: device.lastSeen,
      loginCount: device.loginCount,
      isTrusted: device.isTrusted,
      isActive: device.isActive,
      isCurrent: req.deviceInfo?.deviceId?.toString() === device._id.toString(),
    }));

    res.json({ devices: formattedDevices });
  } catch (error) {
    console.error('Error fetching user devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
}

/**
 * Trust a device
 */
async function trustDevice(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { deviceId } = req.params;

    // Find device and verify it belongs to the user
    const device = await Device.findOne({
      _id: deviceId,
      user: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Mark as trusted
    await device.markAsTrusted();

    res.json({
      message: 'Device marked as trusted',
      device: {
        id: device._id,
        deviceName: device.deviceName,
        isTrusted: device.isTrusted,
      },
    });
  } catch (error) {
    console.error('Error trusting device:', error);
    res.status(500).json({ error: 'Failed to trust device' });
  }
}

/**
 * Remove/deactivate a device
 */
async function removeDevice(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { deviceId } = req.params;

    // Find device and verify it belongs to the user
    const device = await Device.findOne({
      _id: deviceId,
      user: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Deactivate the device
    device.isActive = false;
    await device.save();

    res.json({
      message: 'Device removed successfully',
      device: {
        id: device._id,
        deviceName: device.deviceName,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
}

/**
 * Rename a device
 */
async function renameDevice(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { deviceId } = req.params;
    const { deviceName } = req.body;

    if (!deviceName || deviceName.trim().length === 0) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    // Find device and verify it belongs to the user
    const device = await Device.findOne({
      _id: deviceId,
      user: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update device name
    device.deviceName = deviceName.trim();
    await device.save();

    res.json({
      message: 'Device renamed successfully',
      device: {
        id: device._id,
        deviceName: device.deviceName,
      },
    });
  } catch (error) {
    console.error('Error renaming device:', error);
    res.status(500).json({ error: 'Failed to rename device' });
  }
}

/**
 * Get current device info
 */
async function getCurrentDeviceInfo(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract device data from current request
    const deviceData = await extractDeviceData(req);

    // Find current device
    const device = await Device.findOne({
      user: req.user._id,
      deviceFingerprint: deviceData.deviceFingerprint,
    });

    if (!device) {
      return res.json({
        message: 'Current device not registered',
        deviceData: {
          deviceType: deviceData.deviceType,
          deviceName: deviceData.deviceName,
          platform: deviceData.platform,
          browser: deviceData.browser,
          ipAddress: deviceData.ipAddress,
          location: deviceData.location,
        },
      });
    }

    res.json({
      device: {
        id: device._id,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        platform: device.platform,
        browser: device.browser,
        location: device.location,
        firstSeen: device.firstSeen,
        lastSeen: device.lastSeen,
        loginCount: device.loginCount,
        isTrusted: device.isTrusted,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error('Error fetching current device info:', error);
    res.status(500).json({ error: 'Failed to fetch device info' });
  }
}

module.exports = {
  trackDeviceLogin,
  getUserDevices,
  trustDevice,
  removeDevice,
  renameDevice,
  getCurrentDeviceInfo,
};
