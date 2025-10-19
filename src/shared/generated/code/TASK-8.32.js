const express = require('express');

const router = express.Router();

router.get('/TASK-8.32', (req, res) => {
  res.json({
    taskId: 'TASK-8.32',
    title: 'Note annotation',
    description: 'Implements: Note annotation.',
  });
});

module.exports = router;
