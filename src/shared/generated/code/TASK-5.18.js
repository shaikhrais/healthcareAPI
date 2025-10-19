const express = require('express');

const router = express.Router();

router.get('/TASK-5.18', (req, res) => {
  res.json({
    taskId: 'TASK-5.18',
    title: 'Appointment history',
    description: 'Implements: Appointment history.',
  });
});

module.exports = router;
