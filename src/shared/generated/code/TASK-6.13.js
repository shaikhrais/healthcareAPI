const express = require('express');

const router = express.Router();

router.get('/TASK-6.13', (req, res) => {
  res.json({
    taskId: 'TASK-6.13',
    title: 'Appointment priorities',
    description: 'Implements: Appointment priorities.',
  });
});

module.exports = router;
