const express = require('express');

const router = express.Router();

router.get('/TASK-10.18', (req, res) => {
  res.json({
    taskId: 'TASK-10.18',
    title: 'Predetermination requests',
    description: 'Implements: Predetermination requests.',
  });
});

module.exports = router;
