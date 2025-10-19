const express = require('express');

const router = express.Router();

router.get('/TASK-10.20', (req, res) => {
  res.json({
    taskId: 'TASK-10.20',
    title: 'Cost transparency tools',
    description: 'Implements: Cost transparency tools.',
  });
});

module.exports = router;
