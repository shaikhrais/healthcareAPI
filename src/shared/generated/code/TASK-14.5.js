const express = require('express');

const router = express.Router();

router.get('/TASK-14.5', (req, res) => {
  res.json({
    taskId: 'TASK-14.5',
    title: 'Health Integrations',
    description: 'Apple Health/Google Fit.',
  });
});

module.exports = router;
