const express = require('express');

const router = express.Router();

router.get('/TASK-18.2', (req, res) => {
  res.json({
    taskId: 'TASK-18.2',
    title: 'Monitoring & Observability',
    description: 'Datadog/New Relic/Sentry.',
  });
});

module.exports = router;
