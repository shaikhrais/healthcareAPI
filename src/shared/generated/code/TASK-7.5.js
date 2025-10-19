const express = require('express');

const router = express.Router();

router.get('/TASK-7.5', (req, res) => {
  res.json({
    taskId: 'TASK-7.5',
    title: 'Treatment Plan Builder',
    description: 'SMART goals & interventions.',
  });
});

module.exports = router;
