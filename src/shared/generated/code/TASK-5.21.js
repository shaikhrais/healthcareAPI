const express = require('express');

const router = express.Router();

router.get('/TASK-5.21', (req, res) => {
  res.json({
    taskId: 'TASK-5.21',
    title: 'Appointment search',
    description: 'Implements: Appointment search.',
  });
});

module.exports = router;
