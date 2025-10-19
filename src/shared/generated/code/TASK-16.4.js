const express = require('express');

const router = express.Router();

router.get('/TASK-16.4', (req, res) => {
  res.json({
    taskId: 'TASK-16.4',
    title: 'OpenAPI/Swagger Docs',
    description: 'Interactive docs & samples.',
  });
});

module.exports = router;
