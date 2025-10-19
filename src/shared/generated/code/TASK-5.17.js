const express = require('express');

const router = express.Router();

router.get('/TASK-5.17', (req, res) => {
  res.json({
    taskId: 'TASK-5.17',
    title: 'Provider preferences',
    description: 'Implements: Provider preferences.',
  });
});

module.exports = router;
