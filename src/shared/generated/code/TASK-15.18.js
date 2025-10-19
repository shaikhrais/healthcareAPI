const express = require('express');

const router = express.Router();

router.get('/TASK-15.18', (req, res) => {
  res.json({
    taskId: 'TASK-15.18',
    title: 'Social login providers',
    description: 'Implements: Social login providers.',
  });
});

module.exports = router;
