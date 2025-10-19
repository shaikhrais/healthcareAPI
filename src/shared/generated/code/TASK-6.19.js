const express = require('express');

const router = express.Router();

router.get('/TASK-6.19', (req, res) => {
  res.json({
    taskId: 'TASK-6.19',
    title: 'Cancellation windows',
    description: 'Implements: Cancellation windows.',
  });
});

module.exports = router;
