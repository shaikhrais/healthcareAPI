const express = require('express');

const router = express.Router();

router.get('/TASK-12.1', (req, res) => {
  res.json({
    taskId: 'TASK-12.1',
    title: 'Scheduled Report Delivery',
    description: 'Email reports on cadence.',
  });
});

module.exports = router;
