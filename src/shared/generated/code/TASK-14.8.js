const express = require('express');

const router = express.Router();

router.get('/TASK-14.8', (req, res) => {
  res.json({
    taskId: 'TASK-14.8',
    title: 'App badge counts',
    description: 'Implements: App badge counts.',
  });
});

module.exports = router;
