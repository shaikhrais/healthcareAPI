const express = require('express');

const router = express.Router();

router.get('/TASK-7.31', (req, res) => {
  res.json({
    taskId: 'TASK-7.31',
    title: 'Progress note templates',
    description: 'Implements: Progress note templates.',
  });
});

module.exports = router;
