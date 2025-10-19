const express = require('express');

const router = express.Router();

router.get('/TASK-8.8', (req, res) => {
  res.json({
    taskId: 'TASK-8.8',
    title: 'Outcomes analytics',
    description: 'Implements: Outcomes analytics.',
  });
});

module.exports = router;
