const express = require('express');

const router = express.Router();

router.get('/TASK-18.18', (req, res) => {
  res.json({
    taskId: 'TASK-18.18',
    title: 'Stakeholder Sign-off',
    description: 'Final approvals & sign-offs.',
  });
});

module.exports = router;
