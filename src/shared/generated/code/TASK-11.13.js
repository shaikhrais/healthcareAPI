const express = require('express');

const router = express.Router();

router.get('/TASK-11.13', (req, res) => {
  res.json({
    taskId: 'TASK-11.13',
    title: 'Marketing ROI reports',
    description: 'Implements: Marketing ROI reports.',
  });
});

module.exports = router;
