const express = require('express');

const router = express.Router();

router.get('/TASK-13.8', (req, res) => {
  res.json({
    taskId: 'TASK-13.8',
    title: 'Invoice viewing & history',
    description: 'Implements: Invoice viewing & history.',
  });
});

module.exports = router;
