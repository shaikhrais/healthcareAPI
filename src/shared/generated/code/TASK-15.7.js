const express = require('express');

const router = express.Router();

router.get('/TASK-15.7', (req, res) => {
  res.json({
    taskId: 'TASK-15.7',
    title: 'Google Calendar sync (2-way)',
    description: 'Implements: Google Calendar sync (2-way).',
  });
});

module.exports = router;
