const express = require('express');

const router = express.Router();

router.get('/TASK-13.15', (req, res) => {
  res.json({
    taskId: 'TASK-13.15',
    title: 'Provider quick charting',
    description: 'Implements: Provider quick charting.',
  });
});

module.exports = router;
