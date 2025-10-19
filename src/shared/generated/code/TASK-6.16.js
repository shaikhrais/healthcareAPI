const express = require('express');

const router = express.Router();

router.get('/TASK-6.16', (req, res) => {
  res.json({
    taskId: 'TASK-6.16',
    title: 'Appointment packages',
    description: 'Implements: Appointment packages.',
  });
});

module.exports = router;
