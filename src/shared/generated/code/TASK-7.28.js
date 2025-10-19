const express = require('express');

const router = express.Router();

router.get('/TASK-7.28', (req, res) => {
  res.json({
    taskId: 'TASK-7.28',
    title: 'Physical exam templates',
    description: 'Implements: Physical exam templates.',
  });
});

module.exports = router;
