const express = require('express');

const router = express.Router();

router.get('/TASK-7.11', (req, res) => {
  res.json({
    taskId: 'TASK-7.11',
    title: 'E-prescribing setup',
    description: 'Implements: E-prescribing setup.',
  });
});

module.exports = router;
