const express = require('express');

const router = express.Router();

router.get('/TASK-6.28', (req, res) => {
  res.json({
    taskId: 'TASK-6.28',
    title: 'Schedule printing',
    description: 'Implements: Schedule printing.',
  });
});

module.exports = router;
