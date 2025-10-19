const express = require('express');

const router = express.Router();

router.get('/TASK-10.5', (req, res) => {
  res.json({
    taskId: 'TASK-10.5',
    title: 'Automated Payment Reminders',
    description: 'Schedules + escalation.',
  });
});

module.exports = router;
