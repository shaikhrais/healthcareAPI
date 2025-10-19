const express = require('express');

const router = express.Router();

router.get('/TASK-8.15', (req, res) => {
  res.json({
    taskId: 'TASK-8.15',
    title: 'Macros & shortcuts',
    description: 'Implements: Macros & shortcuts.',
  });
});

module.exports = router;
