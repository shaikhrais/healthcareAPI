const express = require('express');

const router = express.Router();

router.get('/TASK-7.29', (req, res) => {
  res.json({
    taskId: 'TASK-7.29',
    title: 'Specialty-specific forms',
    description: 'Implements: Specialty-specific forms.',
  });
});

module.exports = router;
