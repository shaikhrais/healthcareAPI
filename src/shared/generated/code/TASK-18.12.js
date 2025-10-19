const express = require('express');

const router = express.Router();

router.get('/TASK-18.12', (req, res) => {
  res.json({
    taskId: 'TASK-18.12',
    title: 'Launch Communications',
    description: 'PR + social campaign.',
  });
});

module.exports = router;
