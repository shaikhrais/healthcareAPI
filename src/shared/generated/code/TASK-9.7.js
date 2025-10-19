const express = require('express');

const router = express.Router();

router.get('/TASK-9.7', (req, res) => {
  res.json({
    taskId: 'TASK-9.7',
    title: 'Credit notes/adjustments',
    description: 'Implements: Credit notes/adjustments.',
  });
});

module.exports = router;
