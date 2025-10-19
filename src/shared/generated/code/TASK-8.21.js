const express = require('express');

const router = express.Router();

router.get('/TASK-8.21', (req, res) => {
  res.json({
    taskId: 'TASK-8.21',
    title: 'Provider documentation patterns',
    description: 'Implements: Provider documentation patterns.',
  });
});

module.exports = router;
