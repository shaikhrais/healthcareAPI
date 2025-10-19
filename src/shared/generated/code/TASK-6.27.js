const express = require('express');

const router = express.Router();

router.get('/TASK-6.27', (req, res) => {
  res.json({
    taskId: 'TASK-6.27',
    title: 'Appointment locks',
    description: 'Implements: Appointment locks.',
  });
});

module.exports = router;
