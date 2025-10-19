const express = require('express');

const router = express.Router();

router.get('/TASK-7.17', (req, res) => {
  res.json({
    taskId: 'TASK-7.17',
    title: 'Diagnosis coding',
    description: 'Implements: Diagnosis coding.',
  });
});

module.exports = router;
