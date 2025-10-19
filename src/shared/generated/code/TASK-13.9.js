const express = require('express');

const router = express.Router();

router.get('/TASK-13.9', (req, res) => {
  res.json({
    taskId: 'TASK-13.9',
    title: 'Digital intake forms',
    description: 'Implements: Digital intake forms.',
  });
});

module.exports = router;
