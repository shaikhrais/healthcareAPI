const express = require('express');

const router = express.Router();

router.get('/TASK-5.15', (req, res) => {
  res.json({
    taskId: 'TASK-5.15',
    title: 'Appointment notes',
    description: 'Implements: Appointment notes.',
  });
});

module.exports = router;
