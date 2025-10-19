const express = require('express');

const router = express.Router();

router.get('/TASK-10.3', (req, res) => {
  res.json({
    taskId: 'TASK-10.3',
    title: 'Denial Management',
    description: 'Appeals & analytics.',
  });
});

module.exports = router;
