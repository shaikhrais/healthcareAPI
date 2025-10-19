const express = require('express');

const router = express.Router();

router.get('/TASK-10.23', (req, res) => {
  res.json({
    taskId: 'TASK-10.23',
    title: 'Collections agency integration',
    description: 'Implements: Collections agency integration.',
  });
});

module.exports = router;
