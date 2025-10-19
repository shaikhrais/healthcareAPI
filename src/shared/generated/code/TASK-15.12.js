const express = require('express');

const router = express.Router();

router.get('/TASK-15.12', (req, res) => {
  res.json({
    taskId: 'TASK-15.12',
    title: 'SendGrid email service',
    description: 'Implements: SendGrid email service.',
  });
});

module.exports = router;
