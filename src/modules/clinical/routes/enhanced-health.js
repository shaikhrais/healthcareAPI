const express = require('express');
const enhancedHealthController = require('../controllers/enhancedHealthController');
const router = express.Router();

router.get('/health/database', enhancedHealthController.getDatabaseHealth);
router.get('/health/memory', enhancedHealthController.getMemoryHealth);
router.get('/health/websocket', enhancedHealthController.getWebSocketHealth);

module.exports = router;