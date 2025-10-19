const express = require('express');

const router = express.Router();

router.get('/TASK-1.8', (req, res) => {
  res.json({
    taskId: 'TASK-1.8',
    title: 'API Error Handling Standard',
    description: 'Add capability: API Error Handling Standard.',
  });
});

module.exports = router;
