const express = require('express');

const router = express.Router();

router.get('/TASK-13.14', (req, res) => {
  res.json({
    taskId: 'TASK-13.14',
    title: 'Medication reminders',
    description: 'Implements: Medication reminders.',
  });
});

module.exports = router;
