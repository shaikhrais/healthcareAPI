const express = require('express');

const router = express.Router();

router.get('/TASK-15.9', (req, res) => {
  res.json({
    taskId: 'TASK-15.9',
    title: 'Zoom integration',
    description: 'Implements: Zoom integration.',
  });
});

module.exports = router;
