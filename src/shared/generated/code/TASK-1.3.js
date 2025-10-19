const express = require('express');

const router = express.Router();

router.get('/TASK-1.3', (req, res) => {
  res.json({
    taskId: 'TASK-1.3',
    title: 'Password Reset Flow',
    description: 'Email token, reset, expiration.',
  });
});

module.exports = router;
