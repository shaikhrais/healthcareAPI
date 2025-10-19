const express = require('express');

const router = express.Router();

router.get('/TASK-14.1', (req, res) => {
  res.json({
    taskId: 'TASK-14.1',
    title: 'Offline Mode & Sync',
    description: 'Queue writes; resolve conflicts.',
  });
});

module.exports = router;
