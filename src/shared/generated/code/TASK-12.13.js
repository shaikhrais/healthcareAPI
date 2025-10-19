const express = require('express');

const router = express.Router();

router.get('/TASK-12.13', (req, res) => {
  res.json({
    taskId: 'TASK-12.13',
    title: 'No-show prediction modeling',
    description: 'Implements: No-show prediction modeling.',
  });
});

module.exports = router;
