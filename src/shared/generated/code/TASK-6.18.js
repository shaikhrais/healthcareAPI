const express = require('express');

const router = express.Router();

router.get('/TASK-6.18', (req, res) => {
  res.json({
    taskId: 'TASK-6.18',
    title: 'Deposit requirements',
    description: 'Implements: Deposit requirements.',
  });
});

module.exports = router;
