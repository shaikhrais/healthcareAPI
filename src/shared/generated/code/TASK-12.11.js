const express = require('express');

const router = express.Router();

router.get('/TASK-12.11', (req, res) => {
  res.json({
    taskId: 'TASK-12.11',
    title: 'Supply cost tracking',
    description: 'Implements: Supply cost tracking.',
  });
});

module.exports = router;
