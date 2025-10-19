const express = require('express');

const router = express.Router();

router.get('/TASK-6.20', (req, res) => {
  res.json({
    taskId: 'TASK-6.20',
    title: 'Waiting room management',
    description: 'Implements: Waiting room management.',
  });
});

module.exports = router;
