const express = require('express');

const router = express.Router();

router.get('/TASK-8.9', (req, res) => {
  res.json({
    taskId: 'TASK-8.9',
    title: 'Peer review system',
    description: 'Implements: Peer review system.',
  });
});

module.exports = router;
