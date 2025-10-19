const express = require('express');

const router = express.Router();

router.get('/TASK-12.19', (req, res) => {
  res.json({
    taskId: 'TASK-12.19',
    title: 'Anomaly alerting',
    description: 'Implements: Anomaly alerting.',
  });
});

module.exports = router;
