const express = require('express');

const router = express.Router();

router.get('/TASK-2.5', (req, res) => {
  res.json({
    taskId: 'TASK-2.5',
    title: 'Password Policies',
    description: 'Complexity, history, expiry.',
  });
});

module.exports = router;
