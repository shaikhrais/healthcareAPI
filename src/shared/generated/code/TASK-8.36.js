const express = require('express');

const router = express.Router();

router.get('/TASK-8.36', (req, res) => {
  res.json({
    taskId: 'TASK-8.36',
    title: 'Voice commands library',
    description: 'Implements: Voice commands library.',
  });
});

module.exports = router;
