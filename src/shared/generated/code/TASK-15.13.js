const express = require('express');

const router = express.Router();

router.get('/TASK-15.13', (req, res) => {
  res.json({
    taskId: 'TASK-15.13',
    title: 'Zapier webhooks',
    description: 'Implements: Zapier webhooks.',
  });
});

module.exports = router;
