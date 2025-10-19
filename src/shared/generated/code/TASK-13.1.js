const express = require('express');

const router = express.Router();

router.get('/TASK-13.1', (req, res) => {
  res.json({
    taskId: 'TASK-13.1',
    title: 'Patient Portal - Account',
    description: 'Register/login/profile.',
  });
});

module.exports = router;
