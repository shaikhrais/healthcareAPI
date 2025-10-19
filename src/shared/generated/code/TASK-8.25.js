const express = require('express');

const router = express.Router();

router.get('/TASK-8.25', (req, res) => {
  res.json({
    taskId: 'TASK-8.25',
    title: 'Compliance checking',
    description: 'Implements: Compliance checking.',
  });
});

module.exports = router;
