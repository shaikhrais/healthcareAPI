const express = require('express');

const router = express.Router();

router.get('/TASK-8.22', (req, res) => {
  res.json({
    taskId: 'TASK-8.22',
    title: 'Chart prep automation',
    description: 'Implements: Chart prep automation.',
  });
});

module.exports = router;
