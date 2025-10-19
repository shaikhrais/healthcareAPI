const express = require('express');

const router = express.Router();

router.get('/TASK-2.3', (req, res) => {
  res.json({
    taskId: 'TASK-2.3',
    title: 'User Profile Management',
    description: 'CRUD, avatar upload.',
  });
});

module.exports = router;
