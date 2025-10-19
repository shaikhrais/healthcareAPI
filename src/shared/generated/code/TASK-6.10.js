const express = require('express');

const router = express.Router();

router.get('/TASK-6.10', (req, res) => {
  res.json({
    taskId: 'TASK-6.10',
    title: 'SMS/email integration',
    description: 'Implements: SMS/email integration.',
  });
});

module.exports = router;
