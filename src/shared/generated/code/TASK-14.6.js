const express = require('express');

const router = express.Router();

router.get('/TASK-14.6', (req, res) => {
  res.json({
    taskId: 'TASK-14.6',
    title: 'Push notification preferences',
    description: 'Implements: Push notification preferences.',
  });
});

module.exports = router;
