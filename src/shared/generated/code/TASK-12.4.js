const express = require('express');

const router = express.Router();

router.get('/TASK-12.4', (req, res) => {
  res.json({
    taskId: 'TASK-12.4',
    title: 'Benchmarking & Comparisons',
    description: 'Benchmarks & variance.',
  });
});

module.exports = router;
