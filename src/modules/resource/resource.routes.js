const express = require('express');
const router = express.Router();
const ResourceManager = require('../../shared/managers/resource/ResourceManager');

// GET /api/resource/inventory - Full digital asset inventory
router.get('/inventory', async (req, res) => {
  try {
    const inventory = await ResourceManager.fullInventory();
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
