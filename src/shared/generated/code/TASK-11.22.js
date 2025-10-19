const express = require('express');

const router = express.Router();

router.get('/TASK-11.22', (req, res) => {
  res.json({
    taskId: 'TASK-11.22',
    title: 'Variance analysis',
    description: 'Implements: Variance analysis.',
  });
});

module.exports = router;
