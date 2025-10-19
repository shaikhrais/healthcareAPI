const express = require('express');

const router = express.Router();

router.get('/TASK-6.11', (req, res) => {
  res.json({
    taskId: 'TASK-6.11',
    title: 'Appointment series',
    description: 'Implements: Appointment series.',
  });
});

module.exports = router;
