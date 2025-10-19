const express = require('express');

const router = express.Router();

router.get('/TASK-8.28', (req, res) => {
  res.json({
    taskId: 'TASK-8.28',
    title: 'Guidelines integration',
    description: 'Implements: Guidelines integration.',
  });
});

module.exports = router;
