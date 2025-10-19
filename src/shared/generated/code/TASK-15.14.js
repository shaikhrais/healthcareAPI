const express = require('express');

const router = express.Router();

router.get('/TASK-15.14', (req, res) => {
  res.json({
    taskId: 'TASK-15.14',
    title: 'QuickBooks sync',
    description: 'Implements: QuickBooks sync.',
  });
});

module.exports = router;
