const express = require('express');

const router = express.Router();

router.get('/TASK-14.21', (req, res) => {
  res.json({
    taskId: 'TASK-14.21',
    title: 'Performance monitoring',
    description: 'Implements: Performance monitoring.',
  });
});

module.exports = router;
