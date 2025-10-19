const express = require('express');

const router = express.Router();

router.get('/TASK-5.24', (req, res) => {
  res.json({
    taskId: 'TASK-5.24',
    title: 'Appointment export',
    description: 'Implements: Appointment export.',
  });
});

module.exports = router;
