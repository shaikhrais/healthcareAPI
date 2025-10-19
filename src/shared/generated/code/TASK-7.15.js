const express = require('express');

const router = express.Router();

router.get('/TASK-7.15', (req, res) => {
  res.json({
    taskId: 'TASK-7.15',
    title: 'Referral management',
    description: 'Implements: Referral management.',
  });
});

module.exports = router;
