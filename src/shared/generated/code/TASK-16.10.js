const express = require('express');

const router = express.Router();

router.get('/TASK-16.10', (req, res) => {
  res.json({
    taskId: 'TASK-16.10',
    title: 'Custom field API support',
    description: 'Implements: Custom field API support.',
  });
});

module.exports = router;
