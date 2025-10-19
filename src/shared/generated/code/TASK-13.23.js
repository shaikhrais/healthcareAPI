const express = require('express');

const router = express.Router();

router.get('/TASK-13.23', (req, res) => {
  res.json({
    taskId: 'TASK-13.23',
    title: 'Mobile onboarding tutorial',
    description: 'Implements: Mobile onboarding tutorial.',
  });
});

module.exports = router;
