const express = require('express');

const router = express.Router();

router.get('/TASK-14.15', (req, res) => {
  res.json({
    taskId: 'TASK-14.15',
    title: 'Rating prompts',
    description: 'Implements: Rating prompts.',
  });
});

module.exports = router;
