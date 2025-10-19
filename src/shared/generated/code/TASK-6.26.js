const express = require('express');

const router = express.Router();

router.get('/TASK-6.26', (req, res) => {
  res.json({
    taskId: 'TASK-6.26',
    title: 'Emergency slots',
    description: 'Implements: Emergency slots.',
  });
});

module.exports = router;
