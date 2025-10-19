const express = require('express');

const router = express.Router();

router.get('/TASK-5.4', (req, res) => {
  res.json({
    taskId: 'TASK-5.4',
    title: 'Appointment Types & Durations',
    description: 'Durations, colors, buffers, pricing.',
  });
});

module.exports = router;
