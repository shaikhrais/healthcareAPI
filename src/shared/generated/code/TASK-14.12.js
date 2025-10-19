const express = require('express');

const router = express.Router();

router.get('/TASK-14.12', (req, res) => {
  res.json({
    taskId: 'TASK-14.12',
    title: 'Crash reporting (Sentry)',
    description: 'Implements: Crash reporting (Sentry).',
  });
});

module.exports = router;
