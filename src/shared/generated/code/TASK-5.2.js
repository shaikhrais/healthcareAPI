const express = require('express');

const router = express.Router();

router.get('/TASK-5.2', (req, res) => {
  res.json({
    taskId: 'TASK-5.2',
    title: 'Provider Availability',
    description: 'Hours, breaks, time-off, recurrence.',
  });
});

module.exports = router;
