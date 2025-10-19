const express = require('express');

const router = express.Router();

router.get('/TASK-12.7', (req, res) => {
  res.json({
    taskId: 'TASK-12.7',
    title: 'Net Promoter Score tracking',
    description: 'Implements: Net Promoter Score tracking.',
  });
});

module.exports = router;
