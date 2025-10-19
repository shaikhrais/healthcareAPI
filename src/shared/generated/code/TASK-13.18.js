const express = require('express');

const router = express.Router();

router.get('/TASK-13.18', (req, res) => {
  res.json({
    taskId: 'TASK-13.18',
    title: 'Appointment prep checklist',
    description: 'Implements: Appointment prep checklist.',
  });
});

module.exports = router;
