const express = require('express');

const router = express.Router();

router.get('/TASK-11.20', (req, res) => {
  res.json({
    taskId: 'TASK-11.20',
    title: 'Seasonal trend analysis',
    description: 'Implements: Seasonal trend analysis.',
  });
});

module.exports = router;
