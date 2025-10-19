const express = require('express');

const router = express.Router();

router.get('/TASK-7.22', (req, res) => {
  res.json({
    taskId: 'TASK-7.22',
    title: 'Consent tracking',
    description: 'Implements: Consent tracking.',
  });
});

module.exports = router;
