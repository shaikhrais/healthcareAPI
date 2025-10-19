const express = require('express');

const router = express.Router();

router.get('/TASK-11.17', (req, res) => {
  res.json({
    taskId: 'TASK-11.17',
    title: 'Patient acquisition cost',
    description: 'Implements: Patient acquisition cost.',
  });
});

module.exports = router;
