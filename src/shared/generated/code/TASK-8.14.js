const express = require('express');

const router = express.Router();

router.get('/TASK-8.14', (req, res) => {
  res.json({
    taskId: 'TASK-8.14',
    title: 'Template sharing',
    description: 'Implements: Template sharing.',
  });
});

module.exports = router;
