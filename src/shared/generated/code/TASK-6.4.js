const express = require('express');

const router = express.Router();

router.get('/TASK-6.4', (req, res) => {
  res.json({
    taskId: 'TASK-6.4',
    title: 'Appointment Check-In',
    description: 'Kiosk, status, wait times.',
  });
});

module.exports = router;
