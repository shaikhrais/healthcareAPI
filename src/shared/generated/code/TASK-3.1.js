const express = require('express');

const router = express.Router();

router.get('/TASK-3.1', (req, res) => {
  res.json({
    taskId: 'TASK-3.1',
    title: 'Patient Profile Creation',
    description: 'Demographics, contacts, provider assignment.',
  });
});

module.exports = router;
