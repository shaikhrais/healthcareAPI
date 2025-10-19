const express = require('express');

const router = express.Router();

router.get('/TASK-15.11', (req, res) => {
  res.json({
    taskId: 'TASK-15.11',
    title: 'Twilio SMS/voice',
    description: 'Implements: Twilio SMS/voice.',
  });
});

module.exports = router;
