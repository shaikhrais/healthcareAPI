const express = require('express');

const router = express.Router();

router.get('/TASK-7.12', (req, res) => {
  res.json({
    taskId: 'TASK-7.12',
    title: 'Refill management',
    description: 'Implements: Refill management.',
  });
});

module.exports = router;
