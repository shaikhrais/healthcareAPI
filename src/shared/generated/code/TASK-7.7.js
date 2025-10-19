const express = require('express');

const router = express.Router();

router.get('/TASK-7.7', (req, res) => {
  res.json({
    taskId: 'TASK-7.7',
    title: 'ICD-10 coding',
    description: 'Implements: ICD-10 coding.',
  });
});

module.exports = router;
