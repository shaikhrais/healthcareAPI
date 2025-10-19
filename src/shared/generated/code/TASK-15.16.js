const express = require('express');

const router = express.Router();

router.get('/TASK-15.16', (req, res) => {
  res.json({
    taskId: 'TASK-15.16',
    title: 'Slack notifications',
    description: 'Implements: Slack notifications.',
  });
});

module.exports = router;
