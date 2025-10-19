const express = require('express');

const router = express.Router();

router.get('/TASK-5.22', (req, res) => {
  res.json({
    taskId: 'TASK-5.22',
    title: 'Appointment filters',
    description: 'Implements: Appointment filters.',
  });
});

module.exports = router;
