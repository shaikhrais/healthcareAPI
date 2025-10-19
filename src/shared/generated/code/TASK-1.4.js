const express = require('express');

const router = express.Router();

router.get('/TASK-1.4', (req, res) => {
  res.json({
    taskId: 'TASK-1.4',
    title: 'Docker Configuration',
    description: 'Dockerize app/DB/Redis.',
  });
});

module.exports = router;
