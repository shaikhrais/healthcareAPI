const express = require('express');

const router = express.Router();

router.get('/TASK-7.2', (req, res) => {
  res.json({
    taskId: 'TASK-7.2',
    title: 'Vitals Recording',
    description: 'Vitals + BMI + trends.',
  });
});

module.exports = router;
