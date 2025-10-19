const express = require('express');

const router = express.Router();

router.get('/TASK-12.20', (req, res) => {
  res.json({
    taskId: 'TASK-12.20',
    title: 'Real-time dashboard updates',
    description: 'Implements: Real-time dashboard updates.',
  });
});

module.exports = router;
