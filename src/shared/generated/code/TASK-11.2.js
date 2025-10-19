const express = require('express');

const router = express.Router();

router.get('/TASK-11.2', (req, res) => {
  res.json({
    taskId: 'TASK-11.2',
    title: 'Financial Reports',
    description: 'P&L, AR aging, exports.',
  });
});

module.exports = router;
