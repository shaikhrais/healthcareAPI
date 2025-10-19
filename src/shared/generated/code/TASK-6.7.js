const express = require('express');

const router = express.Router();

router.get('/TASK-6.7', (req, res) => {
  res.json({
    taskId: 'TASK-6.7',
    title: 'Multi-location scheduling',
    description: 'Implements: Multi-location scheduling.',
  });
});

module.exports = router;
