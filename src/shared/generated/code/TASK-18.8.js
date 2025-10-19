const express = require('express');

const router = express.Router();

router.get('/TASK-18.8', (req, res) => {
  res.json({ taskId: 'TASK-18.8', title: 'API Documentation', description: 'OpenAPI + sandbox.' });
});

module.exports = router;
