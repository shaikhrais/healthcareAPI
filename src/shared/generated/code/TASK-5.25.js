const express = require('express');

const router = express.Router();

router.get('/TASK-5.25', (req, res) => {
  res.json({
    taskId: 'TASK-5.25',
    title: 'Appointment statistics',
    description: 'Implements: Appointment statistics.',
  });
});

module.exports = router;
