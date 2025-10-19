const express = require('express');

const router = express.Router();

router.get('/TASK-6.8', (req, res) => {
  res.json({
    taskId: 'TASK-6.8',
    title: 'Provider schedule optimization',
    description: 'Implements: Provider schedule optimization.',
  });
});

module.exports = router;
