const express = require('express');

const router = express.Router();

router.get('/TASK-1.7', (req, res) => {
  res.json({
    taskId: 'TASK-1.7',
    title: 'Rate Limiting & IP Throttling',
    description: 'Add capability: Rate Limiting & IP Throttling.',
  });
});

module.exports = router;
