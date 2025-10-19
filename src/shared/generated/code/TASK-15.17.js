const express = require('express');

const router = express.Router();

router.get('/TASK-15.17', (req, res) => {
  res.json({
    taskId: 'TASK-15.17',
    title: 'Microsoft Teams integration',
    description: 'Implements: Microsoft Teams integration.',
  });
});

module.exports = router;
