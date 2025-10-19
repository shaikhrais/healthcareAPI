const express = require('express');

const router = express.Router();

router.get('/TASK-6.9', (req, res) => {
  res.json({
    taskId: 'TASK-6.9',
    title: 'Mobile calendar app',
    description: 'Implements: Mobile calendar app.',
  });
});

module.exports = router;
