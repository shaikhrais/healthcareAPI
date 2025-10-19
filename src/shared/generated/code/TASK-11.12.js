const express = require('express');

const router = express.Router();

router.get('/TASK-11.12', (req, res) => {
  res.json({
    taskId: 'TASK-11.12',
    title: 'Referral source tracking',
    description: 'Implements: Referral source tracking.',
  });
});

module.exports = router;
