const express = require('express');

const router = express.Router();

router.get('/TASK-15.10', (req, res) => {
  res.json({
    taskId: 'TASK-15.10',
    title: 'Doxy.me integration',
    description: 'Implements: Doxy.me integration.',
  });
});

module.exports = router;
