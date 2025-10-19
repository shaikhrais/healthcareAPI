const express = require('express');

const router = express.Router();

router.get('/TASK-13.7', (req, res) => {
  res.json({
    taskId: 'TASK-13.7',
    title: 'Saved payment methods',
    description: 'Implements: Saved payment methods.',
  });
});

module.exports = router;
