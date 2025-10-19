const express = require('express');

const router = express.Router();

router.get('/TASK-6.14', (req, res) => {
  res.json({
    taskId: 'TASK-6.14',
    title: 'Provider skill matching',
    description: 'Implements: Provider skill matching.',
  });
});

module.exports = router;
