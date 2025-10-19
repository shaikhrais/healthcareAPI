const express = require('express');

const router = express.Router();

router.get('/TASK-6.25', (req, res) => {
  res.json({
    taskId: 'TASK-6.25',
    title: 'Walk-in management',
    description: 'Implements: Walk-in management.',
  });
});

module.exports = router;
