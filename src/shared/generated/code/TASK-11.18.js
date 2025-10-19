const express = require('express');

const router = express.Router();

router.get('/TASK-11.18', (req, res) => {
  res.json({
    taskId: 'TASK-11.18',
    title: 'Lifetime value calculation',
    description: 'Implements: Lifetime value calculation.',
  });
});

module.exports = router;
