const express = require('express');

const router = express.Router();

router.get('/TASK-9.15', (req, res) => {
  res.json({
    taskId: 'TASK-9.15',
    title: 'Deposit requirements',
    description: 'Implements: Deposit requirements.',
  });
});

module.exports = router;
