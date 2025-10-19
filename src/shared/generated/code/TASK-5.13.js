const express = require('express');

const router = express.Router();

router.get('/TASK-5.13', (req, res) => {
  res.json({
    taskId: 'TASK-5.13',
    title: 'Time slot templates',
    description: 'Implements: Time slot templates.',
  });
});

module.exports = router;
