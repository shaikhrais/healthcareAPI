const express = require('express');

const router = express.Router();

router.get('/TASK-12.18', (req, res) => {
  res.json({
    taskId: 'TASK-12.18',
    title: 'A/B test analysis',
    description: 'Implements: A/B test analysis.',
  });
});

module.exports = router;
