const express = require('express');

const router = express.Router();

router.get('/TASK-1.2', (req, res) => {
  res.json({
    taskId: 'TASK-1.2',
    title: 'Login with JWT',
    description: 'Access/refresh tokens, secure sessions.',
  });
});

module.exports = router;
