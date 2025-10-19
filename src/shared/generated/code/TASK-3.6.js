const express = require('express');

const router = express.Router();

router.get('/TASK-3.6', (req, res) => {
  res.json({
    taskId: 'TASK-3.6',
    title: 'Email Templates & Branding',
    description: 'Add capability: Email Templates & Branding.',
  });
});

module.exports = router;
