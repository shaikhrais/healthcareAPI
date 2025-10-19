const express = require('express');

const router = express.Router();

router.get('/TASK-10.15', (req, res) => {
  res.json({
    taskId: 'TASK-10.15',
    title: 'Coordination of benefits',
    description: 'Implements: Coordination of benefits.',
  });
});

module.exports = router;
