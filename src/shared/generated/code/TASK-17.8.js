const express = require('express');

const router = express.Router();

router.get('/TASK-17.8', (req, res) => {
  res.json({
    taskId: 'TASK-17.8',
    title: 'UAT & Bug Bash',
    description: 'UAT + regression/smoke.',
  });
});

module.exports = router;
