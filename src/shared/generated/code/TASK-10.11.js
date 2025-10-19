const express = require('express');

const router = express.Router();

router.get('/TASK-10.11', (req, res) => {
  res.json({
    taskId: 'TASK-10.11',
    title: 'Claim scrubbing',
    description: 'Implements: Claim scrubbing.',
  });
});

module.exports = router;
