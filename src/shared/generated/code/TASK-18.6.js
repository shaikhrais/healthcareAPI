const express = require('express');

const router = express.Router();

router.get('/TASK-18.6', (req, res) => {
  res.json({
    taskId: 'TASK-18.6',
    title: 'Performance Optimization',
    description: 'Indexes/caching/CDN.',
  });
});

module.exports = router;
