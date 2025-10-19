const express = require('express');

const router = express.Router();

router.get('/TASK-14.14', (req, res) => {
  res.json({
    taskId: 'TASK-14.14',
    title: 'Patient surveys',
    description: 'Implements: Patient surveys.',
  });
});

module.exports = router;
