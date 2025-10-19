const express = require('express');

const router = express.Router();

router.get('/TASK-16.14', (req, res) => {
  res.json({
    taskId: 'TASK-16.14',
    title: 'Developer portal',
    description: 'Implements: Developer portal.',
  });
});

module.exports = router;
