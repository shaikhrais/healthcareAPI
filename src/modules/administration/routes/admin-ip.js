const express = require('express');


const IpBlock = require('../models/IpBlock');
const { authMiddleware } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
/**
 * Admin IP Management Routes
 *
 * Endpoints for managing blocked/throttled IPs
 */

const router = express.Router();
// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.user || !['owner', 'full_access'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
  next();
};

/**
 * @route   GET /api/admin/ip/blocked
 * @desc    Get all blocked IPs
 * @access  Admin
 */
router.get('/blocked', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, includeExpired = false } = req.query;

    const blockedIps = await IpBlock.getBlockedIps({
      limit: parseInt(limit, 10),
      includeExpired: includeExpired === 'true',
    });

    res.json({
      blocked: blockedIps,
      total: blockedIps.length,
    });
  } catch (error) {
    console.error('Get blocked IPs error:', error);
    res.status(500).json({ error: 'Server error fetching blocked IPs' });
  }
});

/**
 * @route   GET /api/admin/ip/stats
 * @desc    Get IP blocking statistics
 * @access  Admin
 */
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const stats = await IpBlock.getStats();

    res.json(stats);
  } catch (error) {
    console.error('Get IP stats error:', error);
    res.status(500).json({ error: 'Server error fetching IP statistics' });
  }
});

/**
 * @route   GET /api/admin/ip/:ipAddress
 * @desc    Get details for a specific IP
 * @access  Admin
 */
router.get('/:ipAddress', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.params;

    const ipBlock = await IpBlock.findOne({ ipAddress });

    if (!ipBlock) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No record found for this IP address',
      });
    }

    res.json(ipBlock);
  } catch (error) {
    console.error('Get IP details error:', error);
    res.status(500).json({ error: 'Server error fetching IP details' });
  }
});

/**
 * @route   POST /api/admin/ip/block
 * @desc    Manually block an IP address
 * @access  Admin
 */
router.post('/block', authMiddleware, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { ipAddress, reason, duration, notes } = req.body;

    if (!ipAddress || !reason) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'IP address and reason are required',
      });
    }

    // Calculate expiration
    let expiresAt;
    if (duration === 'permanent') {
      expiresAt = null;
    } else {
      const durationMs = parseInt(duration, 10) || 24 * 60 * 60 * 1000; // 24 hours default
      expiresAt = new Date(Date.now() + durationMs);
    }

    const blocked = await IpBlock.blockIp(ipAddress, reason, {
      permanent: duration === 'permanent',
      expiresAt,
      blockedBy: req.user.userId,
      notes,
      evidence: {
        timestamp: new Date(),
        description: 'Manual block by admin',
        data: { adminId: req.user.userId, adminEmail: req.user.email },
      },
    });

    res.json({
      message: 'IP address blocked successfully',
      blocked,
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({ error: 'Server error blocking IP' });
  }
});

/**
 * @route   POST /api/admin/ip/unblock
 * @desc    Unblock an IP address
 * @access  Admin
 */
router.post('/unblock', authMiddleware, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'IP address is required',
      });
    }

    const ipBlock = await IpBlock.findOne({ ipAddress });

    if (!ipBlock) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No record found for this IP address',
      });
    }

    await ipBlock.unblock(req.user.userId);

    res.json({
      message: 'IP address unblocked successfully',
      ipBlock,
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({ error: 'Server error unblocking IP' });
  }
});

/**
 * @route   POST /api/admin/ip/whitelist
 * @desc    Whitelist an IP address
 * @access  Admin
 */
router.post('/whitelist', authMiddleware, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { ipAddress, notes } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'IP address is required',
      });
    }

    let ipBlock = await IpBlock.findOne({ ipAddress });

    if (!ipBlock) {
      // Create new whitelist entry
      ipBlock = await IpBlock.create({
        ipAddress,
        status: 'whitelisted',
        reason: 'manual_block',
        blockedBy: req.user.userId,
        blockedBySystem: false,
        notes,
      });
    } else {
      await ipBlock.whitelist(req.user.userId);
      if (notes) {
        ipBlock.notes = notes;
        await ipBlock.save();
      }
    }

    res.json({
      message: 'IP address whitelisted successfully',
      ipBlock,
    });
  } catch (error) {
    console.error('Whitelist IP error:', error);
    res.status(500).json({ error: 'Server error whitelisting IP' });
  }
});

/**
 * @route   DELETE /api/admin/ip/:ipAddress
 * @desc    Delete IP record
 * @access  Admin
 */
router.delete('/:ipAddress', authMiddleware, requireAdmin, strictLimiter, async (req, res) => {
  try {
    const { ipAddress } = req.params;

    const result = await IpBlock.deleteOne({ ipAddress });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No record found for this IP address',
      });
    }

    res.json({
      message: 'IP record deleted successfully',
    });
  } catch (error) {
    console.error('Delete IP error:', error);
    res.status(500).json({ error: 'Server error deleting IP record' });
  }
});

/**
 * @route   POST /api/admin/ip/cleanup
 * @desc    Clean up expired blocks
 * @access  Admin
 */
router.post('/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const count = await IpBlock.cleanupExpired();

    res.json({
      message: `Cleaned up ${count} expired block(s)`,
      count,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Server error cleaning up expired blocks' });
  }
});

/**
 * @route   GET /api/admin/ip/search
 * @desc    Search IP records
 * @access  Admin
 */
router.get('/search/query', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { q, status, limit = 50 } = req.query;

    const query = {};

    if (q) {
      query.ipAddress = { $regex: q, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    const results = await IpBlock.find(query)
      .limit(parseInt(limit, 10))
      .sort({ 'violations.count': -1, createdAt: -1 });

    res.json({
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('Search IPs error:', error);
    res.status(500).json({ error: 'Server error searching IPs' });
  }
});

/**
 * @route   POST /api/admin/ip/:ipAddress/notes
 * @desc    Add notes to IP record
 * @access  Admin
 */
router.post('/:ipAddress/notes', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.params;
    const { notes } = req.body;

    const ipBlock = await IpBlock.findOne({ ipAddress });

    if (!ipBlock) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No record found for this IP address',
      });
    }

    ipBlock.notes = notes;
    await ipBlock.save();

    res.json({
      message: 'Notes updated successfully',
      ipBlock,
    });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: 'Server error updating notes' });
  }
});

module.exports = router;
