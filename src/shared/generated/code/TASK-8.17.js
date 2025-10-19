const express = require('express');

const router = express.Router();

router.get('/TASK-8.17', (req, res) => {
  res.json({
    taskId: 'TASK-8.17',
    title: 'Chart review checklist',
    description: 'Implements: Chart review checklist.',
  });
});

module.exports = router;
