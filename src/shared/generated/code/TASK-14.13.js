const express = require('express');

const router = express.Router();

router.get('/TASK-14.13', (req, res) => {
  res.json({
    taskId: 'TASK-14.13',
    title: 'In-app feedback forms',
    description: 'Implements: In-app feedback forms.',
  });
});

module.exports = router;
