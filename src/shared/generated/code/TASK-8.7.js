const express = require('express');

const router = express.Router();

router.get('/TASK-8.7', (req, res) => {
  res.json({
    taskId: 'TASK-8.7',
    title: 'Clinical pathways automation',
    description: 'Implements: Clinical pathways automation.',
  });
});

module.exports = router;
