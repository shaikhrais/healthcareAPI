const express = require('express');

const router = express.Router();

router.get('/TASK-5.5', (req, res) => {
  res.json({
    taskId: 'TASK-5.5',
    title: 'Waitlist Management',
    description: 'Queue + auto notifications.',
  });
});

module.exports = router;
