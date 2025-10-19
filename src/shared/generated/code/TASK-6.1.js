const express = require('express');

const router = express.Router();

router.get('/TASK-6.1', (req, res) => {
  res.json({
    taskId: 'TASK-6.1',
    title: 'No-Show & Cancellation',
    description: 'Track & fee policies.',
  });
});

module.exports = router;
