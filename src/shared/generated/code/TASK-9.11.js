const express = require('express');

const router = express.Router();

router.get('/TASK-9.11', (req, res) => {
  res.json({
    taskId: 'TASK-9.11',
    title: 'Copay collection at check-in',
    description: 'Implements: Copay collection at check-in.',
  });
});

module.exports = router;
