const express = require('express');

const router = express.Router();

router.get('/TASK-11.21', (req, res) => {
  res.json({
    taskId: 'TASK-11.21',
    title: 'Budget vs actual reports',
    description: 'Implements: Budget vs actual reports.',
  });
});

module.exports = router;
