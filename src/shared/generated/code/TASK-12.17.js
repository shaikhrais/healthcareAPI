const express = require('express');

const router = express.Router();

router.get('/TASK-12.17', (req, res) => {
  res.json({
    taskId: 'TASK-12.17',
    title: 'Attribution reporting',
    description: 'Implements: Attribution reporting.',
  });
});

module.exports = router;
