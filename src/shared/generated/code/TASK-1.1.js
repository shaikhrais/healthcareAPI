const express = require('express');

const router = express.Router();

router.get('/TASK-1.1', (req, res) => {
  res.json({
    taskId: 'TASK-1.1',
    title: 'User Registration System',
    description: 'Registration with email verification.',
  });
});

module.exports = router;
