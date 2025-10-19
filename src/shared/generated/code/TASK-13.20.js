const express = require('express');

const router = express.Router();

router.get('/TASK-13.20', (req, res) => {
  res.json({
    taskId: 'TASK-13.20',
    title: 'Prescription refill requests',
    description: 'Implements: Prescription refill requests.',
  });
});

module.exports = router;
