const express = require('express');

const router = express.Router();

router.get('/TASK-14.20', (req, res) => {
  res.json({
    taskId: 'TASK-14.20',
    title: 'Haptic feedback',
    description: 'Implements: Haptic feedback.',
  });
});

module.exports = router;
