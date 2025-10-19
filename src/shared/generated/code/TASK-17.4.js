const express = require('express');

const router = express.Router();

router.get('/TASK-17.4', (req, res) => {
  res.json({
    taskId: 'TASK-17.4',
    title: 'Performance Testing',
    description: 'k6/Artillery benchmarks.',
  });
});

module.exports = router;
