const express = require('express');

const router = express.Router();

router.get('/TASK-16.16', (req, res) => {
  res.json({
    taskId: 'TASK-16.16',
    title: 'Integration templates',
    description: 'Implements: Integration templates.',
  });
});

module.exports = router;
