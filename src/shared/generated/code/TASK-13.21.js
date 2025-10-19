const express = require('express');

const router = express.Router();

router.get('/TASK-13.21', (req, res) => {
  res.json({
    taskId: 'TASK-13.21',
    title: 'Referral tracking',
    description: 'Implements: Referral tracking.',
  });
});

module.exports = router;
