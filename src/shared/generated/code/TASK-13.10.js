const express = require('express');

const router = express.Router();

router.get('/TASK-13.10', (req, res) => {
  res.json({
    taskId: 'TASK-13.10',
    title: 'E-signatures on mobile',
    description: 'Implements: E-signatures on mobile.',
  });
});

module.exports = router;
