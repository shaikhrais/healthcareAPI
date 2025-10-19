const express = require('express');

const router = express.Router();

router.get('/TASK-6.12', (req, res) => {
  res.json({
    taskId: 'TASK-6.12',
    title: 'Visit reasons',
    description: 'Implements: Visit reasons.',
  });
});

module.exports = router;
