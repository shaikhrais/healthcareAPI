const express = require('express');

const router = express.Router();

router.get('/TASK-5.14', (req, res) => {
  res.json({
    taskId: 'TASK-5.14',
    title: 'Buffer time management',
    description: 'Implements: Buffer time management.',
  });
});

module.exports = router;
