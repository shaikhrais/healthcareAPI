const express = require('express');

const router = express.Router();

router.get('/TASK-1.6', (req, res) => {
  res.json({
    taskId: 'TASK-1.6',
    title: 'Session Revocation Endpoint',
    description: 'Add capability: Session Revocation Endpoint.',
  });
});

module.exports = router;
