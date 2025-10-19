const express = require('express');

const router = express.Router();

router.get('/TASK-8.26', (req, res) => {
  res.json({
    taskId: 'TASK-8.26',
    title: 'Templates versioning system',
    description: 'Implements: Templates versioning system.',
  });
});

module.exports = router;
