const express = require('express');

const router = express.Router();

router.get('/TASK-9.5', (req, res) => {
  res.json({
    taskId: 'TASK-9.5',
    title: 'AR Tracking',
    description: 'Aging buckets, collections.',
  });
});

module.exports = router;
