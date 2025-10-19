const express = require('express');

const router = express.Router();

router.get('/TASK-13.22', (req, res) => {
  res.json({
    taskId: 'TASK-13.22',
    title: 'Lab result notifications',
    description: 'Implements: Lab result notifications.',
  });
});

module.exports = router;
