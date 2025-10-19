const express = require('express');

const router = express.Router();

router.get('/TASK-16.17', (req, res) => {
  res.json({
    taskId: 'TASK-16.17',
    title: 'Partner certification program',
    description: 'Implements: Partner certification program.',
  });
});

module.exports = router;
