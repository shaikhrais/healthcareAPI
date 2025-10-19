const express = require('express');

const router = express.Router();

router.get('/TASK-10.19', (req, res) => {
  res.json({
    taskId: 'TASK-10.19',
    title: 'Patient responsibility estimation',
    description: 'Implements: Patient responsibility estimation.',
  });
});

module.exports = router;
