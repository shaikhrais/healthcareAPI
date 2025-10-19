const express = require('express');

const router = express.Router();

router.get('/TASK-3.9', (req, res) => {
  res.json({
    taskId: 'TASK-3.9',
    title: 'Search Query Parser',
    description: 'Add capability: Search Query Parser.',
  });
});

module.exports = router;
