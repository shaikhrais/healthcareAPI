const express = require('express');

const router = express.Router();

router.get('/TASK-10.1', (req, res) => {
  res.json({
    taskId: 'TASK-10.1',
    title: 'ERA/EOB Parsing',
    description: 'Parse 835; auto-posting.',
  });
});

module.exports = router;
