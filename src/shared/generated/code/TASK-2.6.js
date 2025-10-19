const express = require('express');

const router = express.Router();

router.get('/TASK-2.6', (req, res) => {
  res.json({
    taskId: 'TASK-2.6',
    title: 'JWT Blacklist/Allowlist',
    description: 'Add capability: JWT Blacklist/Allowlist.',
  });
});

module.exports = router;
