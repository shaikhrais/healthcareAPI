const express = require('express');

const router = express.Router();

router.get('/TASK-6.21', (req, res) => {
  res.json({
    taskId: 'TASK-6.21',
    title: 'Appointment preparation notes',
    description: 'Implements: Appointment preparation notes.',
  });
});

module.exports = router;
