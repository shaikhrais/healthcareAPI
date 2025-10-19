const express = require('express');

const router = express.Router();

router.get('/TASK-7.27', (req, res) => {
  res.json({
    taskId: 'TASK-7.27',
    title: 'Review of systems templates',
    description: 'Implements: Review of systems templates.',
  });
});

module.exports = router;
