const express = require('express');

const router = express.Router();

router.get('/TASK-14.9', (req, res) => {
  res.json({
    taskId: 'TASK-14.9',
    title: 'Deep linking & universal links',
    description: 'Implements: Deep linking & universal links.',
  });
});

module.exports = router;
