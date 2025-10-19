const express = require('express');

const router = express.Router();

router.get('/TASK-2.2', (req, res) => {
  res.json({
    taskId: 'TASK-2.2',
    title: 'Permission Middleware',
    description: 'JWT + permission checks.',
  });
});

module.exports = router;
