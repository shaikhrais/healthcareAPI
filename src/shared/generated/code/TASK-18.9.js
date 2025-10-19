const express = require('express');

const router = express.Router();

router.get('/TASK-18.9', (req, res) => {
  res.json({
    taskId: 'TASK-18.9',
    title: 'Training & Onboarding',
    description: 'Staff training; support portal.',
  });
});

module.exports = router;
