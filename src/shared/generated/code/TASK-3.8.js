const express = require('express');

const router = express.Router();

router.get('/TASK-3.8', (req, res) => {
  res.json({
    taskId: 'TASK-3.8',
    title: 'Structured Logging (JSON)',
    description: 'Add capability: Structured Logging (JSON).',
  });
});

module.exports = router;
