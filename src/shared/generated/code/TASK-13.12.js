const express = require('express');

const router = express.Router();

router.get('/TASK-13.12', (req, res) => {
  res.json({
    taskId: 'TASK-13.12',
    title: 'Family member management',
    description: 'Implements: Family member management.',
  });
});

module.exports = router;
