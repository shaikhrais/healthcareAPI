const express = require('express');

const router = express.Router();

router.get('/TASK-10.22', (req, res) => {
  res.json({
    taskId: 'TASK-10.22',
    title: 'Bad debt tracking',
    description: 'Implements: Bad debt tracking.',
  });
});

module.exports = router;
