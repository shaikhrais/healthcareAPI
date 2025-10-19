const express = require('express');

const router = express.Router();

router.get('/TASK-6.5', (req, res) => {
  res.json({
    taskId: 'TASK-6.5',
    title: 'Schedule Analytics Dashboard',
    description: 'Utilization, no-shows, revenue.',
  });
});

module.exports = router;
