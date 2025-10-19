const express = require('express');

const router = express.Router();

router.get('/TASK-13.4', (req, res) => {
  res.json({
    taskId: 'TASK-13.4',
    title: 'Patient Portal - Messaging',
    description: 'Secure HIPAA chat.',
  });
});

module.exports = router;
