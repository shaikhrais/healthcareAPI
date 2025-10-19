const express = require('express');

const router = express.Router();

router.get('/TASK-8.20', (req, res) => {
  res.json({
    taskId: 'TASK-8.20',
    title: 'Note completion rates',
    description: 'Implements: Note completion rates.',
  });
});

module.exports = router;
