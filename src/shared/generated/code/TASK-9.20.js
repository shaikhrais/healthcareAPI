const express = require('express');

const router = express.Router();

router.get('/TASK-9.20', (req, res) => {
  res.json({
    taskId: 'TASK-9.20',
    title: 'Tax configuration by location',
    description: 'Implements: Tax configuration by location.',
  });
});

module.exports = router;
