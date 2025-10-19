const express = require('express');

const router = express.Router();

router.get('/TASK-12.8', (req, res) => {
  res.json({
    taskId: 'TASK-12.8',
    title: 'Online review monitoring',
    description: 'Implements: Online review monitoring.',
  });
});

module.exports = router;
