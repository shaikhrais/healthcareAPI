/**
 * QueueManager
 * Background job queue abstraction (BullMQ/RabbitMQ/Azure SB ready).
 */
const jobs = [];

const QueueManager = {
  addJob(job) {
    jobs.push({ ...job, status: 'queued', created: new Date() });
    return jobs.length;
  },
  getJobs() {
    return jobs;
  },
  // Placeholder for real queue integration
};

module.exports = QueueManager;