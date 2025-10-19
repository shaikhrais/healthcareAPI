const express = require('express');

const router = express.Router();

router.get('/TASK-13.11', (req, res) => {
  res.json({
    taskId: 'TASK-13.11',
    title: 'Insurance card upload',
    description: 'Implements: Insurance card upload.',
  });
});

module.exports = router;
