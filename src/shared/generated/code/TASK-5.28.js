const express = require('express');

const router = express.Router();

router.get('/TASK-5.28', (req, res) => {
  res.json({
    taskId: 'TASK-5.28',
    title: 'Multi-location support',
    description: 'Implements: Multi-location support.',
  });
});

module.exports = router;
