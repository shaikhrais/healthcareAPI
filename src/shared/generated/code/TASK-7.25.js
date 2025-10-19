const express = require('express');

const router = express.Router();

router.get('/TASK-7.25', (req, res) => {
  res.json({
    taskId: 'TASK-7.25',
    title: 'Family history',
    description: 'Implements: Family history.',
  });
});

module.exports = router;
