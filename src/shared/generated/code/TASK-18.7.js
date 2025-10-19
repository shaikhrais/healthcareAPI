const express = require('express');

const router = express.Router();

router.get('/TASK-18.7', (req, res) => {
  res.json({
    taskId: 'TASK-18.7',
    title: 'User Documentation',
    description: 'Guides, manuals, videos.',
  });
});

module.exports = router;
