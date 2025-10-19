const express = require('express');

const router = express.Router();

router.get('/TASK-13.16', (req, res) => {
  res.json({
    taskId: 'TASK-13.16',
    title: 'Mobile dictation',
    description: 'Implements: Mobile dictation.',
  });
});

module.exports = router;
