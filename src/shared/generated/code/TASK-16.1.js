const express = require('express');

const router = express.Router();

router.get('/TASK-16.1', (req, res) => {
  res.json({
    taskId: 'TASK-16.1',
    title: 'Public REST API',
    description: 'OAuth2; rate limiting; versioning.',
  });
});

module.exports = router;
