const express = require('express');

const router = express.Router();

router.get('/TASK-5.3', (req, res) => {
  res.json({
    taskId: 'TASK-5.3',
    title: 'Appointment Booking Flow',
    description: 'Service->provider->time wizard.',
  });
});

module.exports = router;
