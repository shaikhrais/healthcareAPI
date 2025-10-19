const express = require('express');

const router = express.Router();

router.get('/TASK-11.7', (req, res) => {
  res.json({
    taskId: 'TASK-11.7',
    title: 'Appointment type analysis',
    description: 'Implements: Appointment type analysis.',
  });
});

module.exports = router;
