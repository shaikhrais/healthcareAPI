const express = require('express');

const router = express.Router();

router.get('/TASK-5.19', (req, res) => {
  res.json({
    taskId: 'TASK-5.19',
    title: 'Cancellation policies',
    description: 'Implements: Cancellation policies.',
  });
});

module.exports = router;
