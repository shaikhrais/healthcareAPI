// Claims Service
const Claim = require('../models/Claim');
const ScrubReport = require('../models/ScrubReport');
const { claimScrubber, ScrubStatus } = require('../services/claimScrubber');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const createClaim = async (body, user) => {
  const claimData = { ...body, createdBy: user.userId };
  if (!claimData.patient.id) throw new BadRequestError('Patient ID is required');
  const claim = new Claim(claimData);
  await claim.save();
  logger.info('Claim created', { claimId: claim._id, claimNumber: claim.claimNumber, userId: user.userId });
  return { success: true, data: { claim } };
};

const getAllClaims = async (query, user) => {
  // ...implement filtering logic as in route...
  // For brevity, copy logic from original route
  // (You can refactor this for DRY in a real project)
  const {
    status, patientId, providerId, payerId, startDate, endDate, scrubStatus,
    page = 1, limit = 20, sort = '-createdAt',
  } = query;
  const filter = {};
  if (user.role === 'patient') filter['patient.id'] = user.userId;
  else if (user.role === 'practitioner') filter['provider.id'] = user.userId;
  if (status) filter.status = status;
  if (patientId) filter['patient.id'] = patientId;
  if (providerId) filter['provider.id'] = providerId;
  if (payerId) filter['insurance.payerId'] = payerId;
  if (scrubStatus) filter['scrubbing.status'] = scrubStatus;
  if (startDate || endDate) {
    filter.serviceDate = {};
    if (startDate) filter.serviceDate.$gte = new Date(startDate);
    if (endDate) filter.serviceDate.$lte = new Date(endDate);
  }
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('scrubbing.report', 'status summary')
      .lean(),
    Claim.countDocuments(filter),
  ]);
  return {
    success: true,
    data: {
      claims,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    },
  };
};

const getClaimById = async (id, user) => {
  const claim = await Claim.findById(id)
    .populate('scrubbing.report')
    .populate('createdBy', 'firstName lastName')
    .populate('submission.submittedBy', 'firstName lastName');
  if (!claim) throw new NotFoundError('Claim', id);
  if (user.role === 'patient' && claim.patient.id.toString() !== user.userId) throw new ForbiddenError('Access denied');
  if (user.role === 'practitioner' && claim.provider.id.toString() !== user.userId) throw new ForbiddenError('Access denied');
  return { success: true, data: { claim } };
};

const updateClaim = async (id, body, user) => {
  const claim = await Claim.findById(id);
  if (!claim) throw new NotFoundError('Claim', id);
  if (['submitted', 'accepted', 'paid'].includes(claim.status)) throw new BadRequestError('Cannot edit submitted claims');
  Object.assign(claim, body);
  claim.updatedBy = user.userId;
  if (body.diagnosisCodes || body.procedures || body.insurance) {
    claim.scrubbing.status = 'not_scrubbed';
    claim.scrubbing.lastScrubDate = null;
  }
  await claim.save();
  logger.info('Claim updated', { claimId: claim._id, claimNumber: claim.claimNumber, userId: user.userId });
  return { success: true, data: { claim } };
};

const deleteClaim = async (id, user) => {
  const claim = await Claim.findById(id);
  if (!claim) throw new NotFoundError('Claim', id);
  if (claim.status !== 'draft') throw new BadRequestError('Only draft claims can be deleted');
  await claim.deleteOne();
  logger.info('Claim deleted', { claimId: claim._id, claimNumber: claim.claimNumber, userId: user.userId });
  return { success: true, message: 'Claim deleted successfully' };
};

const scrubClaim = async (id, body, user) => {
  // ...implement scrubbing logic as in route...
  // For brevity, copy logic from original route
  const claim = await Claim.findById(id);
  if (!claim) throw new NotFoundError('Claim', id);
  const { autoFix = false, categories = null } = body;
  const claimSnapshot = claim.toObject();
  const previousReport = await ScrubReport.getLatestForClaim(claim._id);
  const scrubResult = await claimScrubber.scrub(claim, { autoFix, categories });
  claim.scrubbing = {
    lastScrubDate: new Date(),
    status: scrubResult.status,
    errorCount: scrubResult.summary.errorCount,
    warningCount: scrubResult.summary.warningCount,
    autoFixedCount: scrubResult.summary.fixedCount,
  };
  const report = new ScrubReport({
    claim: claim._id,
    claimNumber: claim.claimNumber,
    status: scrubResult.status,
    errors: scrubResult.errors,
    warnings: scrubResult.warnings,
    info: scrubResult.info,
    fixedIssues: scrubResult.fixedIssues,
    summary: scrubResult.summary,
    categories: scrubResult.categories,
    config: { autoFix, categories },
    duration: scrubResult.duration,
    scrubbedBy: user.userId,
    claimSnapshot,
    previousReport: previousReport?._id,
  });
  report.recommendations = claimScrubber.getRecommendations(scrubResult);
  await report.save();
  claim.scrubbing.report = report._id;
  if (
    scrubResult.status === ScrubStatus.PASS ||
    scrubResult.status === ScrubStatus.PASS_WITH_WARNINGS
  ) {
    claim.status = 'ready';
  }
  await claim.save();
  logger.info('Claim scrubbed', {
    claimId: claim._id,
    claimNumber: claim.claimNumber,
    status: scrubResult.status,
    errorCount: scrubResult.summary.errorCount,
    fixedCount: scrubResult.summary.fixedCount,
    userId: user.userId,
  });
  return {
    success: true,
    data: {
      scrubResult,
      report,
      claim: {
        _id: claim._id,
        claimNumber: claim.claimNumber,
        status: claim.status,
        scrubbing: claim.scrubbing,
      },
    },
  };
};

const autoFixClaim = async (id, user) => {
  const claim = await Claim.findById(id);
  if (!claim) throw new NotFoundError('Claim', id);
  const fixResult = await claimScrubber.autoFixAll(claim);
  if (fixResult.fixed) {
    await claim.save();
    const scrubResult = await claimScrubber.scrub(claim, { autoFix: false });
    logger.info('Claim auto-fixed', {
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      fixedCount: fixResult.fixedCount,
      userId: user.userId,
    });
    return {
      success: true,
      data: {
        fixResult,
        scrubResult,
      },
    };
  } else {
    return {
      success: true,
      message: fixResult.message,
      data: { fixResult },
    };
  }
};

const getScrubReports = async (id) => {
  const reports = await ScrubReport.getAllForClaim(id);
  return { success: true, data: { reports } };
};

const getLatestScrubReport = async (id) => {
  const report = await ScrubReport.getLatestForClaim(id);
  if (!report) throw new NotFoundError('Scrub report not found');
  return { success: true, data: { report } };
};

const submitClaim = async (id, user) => {
  const claim = await Claim.findById(id);
  if (!claim) throw new NotFoundError('Claim', id);
  if (!claim.isReadyForSubmission()) throw new BadRequestError('Claim must pass scrubbing before submission');
  if (!claim.isWithinTimelyFiling()) {
    logger.warn('Claim submitted past timely filing limit', {
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      userId: user.userId,
    });
  }
  const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  claim.markAsSubmitted(user.userId, trackingNumber);
  await claim.save();
  logger.info('Claim submitted', {
    claimId: claim._id,
    claimNumber: claim.claimNumber,
    trackingNumber,
    userId: user.userId,
  });
  return {
    success: true,
    data: {
      claim: {
        _id: claim._id,
        claimNumber: claim.claimNumber,
        status: claim.status,
        trackingNumber,
      },
    },
  };
};

const resubmitClaim = async (id, body, user) => {
  const originalClaim = await Claim.findById(id);
  if (!originalClaim) throw new NotFoundError('Claim', id);
  const { reason, changes = {} } = body;
  const resubmission = await originalClaim.createResubmission(reason, changes);
  resubmission.createdBy = user.userId;
  await resubmission.save();
  logger.info('Claim resubmission created', {
    originalClaimId: originalClaim._id,
    resubmissionId: resubmission._id,
    reason,
    userId: user.userId,
  });
  return { success: true, data: { claim: resubmission } };
};

const getStatsOverview = async (query) => {
  const { startDate, endDate } = query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  const filter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
  const [total, byStatus, byScrubStatus, avgCharges, readyToSubmit, needingScrubbing] = await Promise.all([
    Claim.countDocuments(filter),
    Claim.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Claim.aggregate([
      { $match: filter },
      { $group: { _id: '$scrubbing.status', count: { $sum: 1 } } },
    ]),
    Claim.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: '$totalCharges' } } },
    ]),
    Claim.countDocuments({
      ...filter,
      status: { $in: ['draft', 'ready'] },
      'scrubbing.status': { $in: ['pass', 'pass_with_warnings', 'fixed'] },
    }),
    Claim.countDocuments({
      ...filter,
      status: 'draft',
      'scrubbing.status': { $in: ['not_scrubbed', 'fail'] },
    }),
  ]);
  const stats = {
    total,
    byStatus: byStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
    byScrubStatus: byScrubStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
    averageCharges: avgCharges[0]?.avg || 0,
    readyToSubmit,
    needingScrubbing,
  };
  return { success: true, data: stats };
};

const batchScrubClaims = async (body, user) => {
  const { claimIds, autoFix = false } = body;
  const claims = await Claim.find({ _id: { $in: claimIds } });
  if (claims.length === 0) throw new NotFoundError('No claims found');
  const batchResult = await claimScrubber.scrubBatch(claims, { autoFix });
  for (let i = 0; i < claims.length; i += 1) {
    const claim = claims[i];
    const result = batchResult.results[i];
    const report = new ScrubReport({
      claim: claim._id,
      claimNumber: claim.claimNumber,
      status: result.status,
      errors: result.errors,
      warnings: result.warnings,
      info: result.info,
      fixedIssues: result.fixedIssues,
      summary: result.summary,
      categories: result.categories,
      config: { autoFix },
      duration: result.duration,
      scrubbedBy: user.userId,
      claimSnapshot: claim.toObject(),
    });
    await report.save();
    claim.scrubbing = {
      lastScrubDate: new Date(),
      status: result.status,
      errorCount: result.summary.errorCount,
      warningCount: result.summary.warningCount,
      autoFixedCount: result.summary.fixedCount,
      report: report._id,
    };
    await claim.save();
  }
  logger.info('Batch scrub completed', { claimCount: claims.length, summary: batchResult.summary, userId: user.userId });
  return { success: true, data: batchResult };
};

module.exports = {
  createClaim,
  getAllClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
  scrubClaim,
  autoFixClaim,
  getScrubReports,
  getLatestScrubReport,
  submitClaim,
  resubmitClaim,
  getStatsOverview,
  batchScrubClaims,
};
