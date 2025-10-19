const express = require('express');

const router = express.Router();

router.get('/TASK-6.23', (req, res) => {
  res.json({
    taskId: 'TASK-6.23',
    title: 'Appointment follow-ups',
    description: 'Implements: Appointment follow-ups.',
  });
});

module.exports = router;
