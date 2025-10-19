const express = require('express');

const router = express.Router();

router.get('/TASK-15.15', (req, res) => {
  res.json({
    taskId: 'TASK-15.15',
    title: 'Mailchimp automation',
    description: 'Implements: Mailchimp automation.',
  });
});

module.exports = router;
