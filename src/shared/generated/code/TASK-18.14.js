const express = require('express');

const router = express.Router();

router.get('/TASK-18.14', (req, res) => {
  res.json({
    taskId: 'TASK-18.14',
    title: 'Customer Onboarding Workflow',
    description: 'Standard onboarding playbooks.',
  });
});

module.exports = router;
