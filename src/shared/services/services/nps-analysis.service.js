
const NPSScore = require('../models/NPSScore');
/**
 * NPS Analysis Service
 *
 * Advanced NPS analytics and insights
 */

class NPSAnalysisService {
  /**
   * Get comprehensive NPS dashboard
   */
  async getDashboard(filters = {}, dateRange = {}) {
    const [overview, trend, breakdown, recentDetractors, recentPromoters, followupStats] =
      await Promise.all([
        this.getOverview(filters, dateRange),
        this.getTrendAnalysis(filters, dateRange),
        this.getDimensionalBreakdown(filters, dateRange),
        NPSScore.getDetractors(filters, dateRange),
        NPSScore.getPromoters(filters, dateRange),
        this.getFollowupStats(filters.organization),
      ]);

    return {
      overview,
      trend,
      breakdown,
      recentDetractors: recentDetractors.slice(0, 10),
      recentPromoters: recentPromoters.slice(0, 10),
      followupStats,
    };
  }

  /**
   * Get NPS overview
   */
  async getOverview(filters = {}, dateRange = {}) {
    const current = await NPSScore.calculateNPS(filters, dateRange);

    // Calculate comparison period
    let comparison = null;
    if (dateRange.startDate && dateRange.endDate) {
      const periodLength = dateRange.endDate - dateRange.startDate;
      const comparisonRange = {
        startDate: new Date(dateRange.startDate.getTime() - periodLength),
        endDate: dateRange.startDate,
      };
      comparison = await NPSScore.calculateNPS(filters, comparisonRange);
    }

    const change = comparison
      ? {
          value: current.npsScore - comparison.npsScore,
          percentage:
            comparison.npsScore !== 0
              ? ((current.npsScore - comparison.npsScore) / Math.abs(comparison.npsScore)) * 100
              : 0,
        }
      : null;

    return {
      current,
      comparison,
      change,
    };
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(filters = {}, dateRange = {}, interval = 'week') {
    return await NPSScore.getTrend(filters, dateRange, interval);
  }

  /**
   * Get dimensional breakdown
   */
  async getDimensionalBreakdown(filters = {}, dateRange = {}) {
    const [byPractitioner, byServiceType, bySource] = await Promise.all([
      NPSScore.getBreakdown('practitionerId', filters, dateRange),
      NPSScore.getBreakdown('serviceType', filters, dateRange),
      NPSScore.getBreakdown('source', filters, dateRange),
    ]);

    return {
      byPractitioner: byPractitioner.slice(0, 10),
      byServiceType: byServiceType.slice(0, 10),
      bySource,
    };
  }

  /**
   * Get follow-up statistics
   */
  async getFollowupStats(organizationId) {
    const needingFollowup = await NPSScore.getNeedingFollowup(organizationId);

    const assigned = needingFollowup.filter((s) => s.followup.assignedTo);
    const unassigned = needingFollowup.filter((s) => !s.followup.assignedTo);

    // Get completed follow-ups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completed = await NPSScore.countDocuments({
      organization: organizationId,
      'followup.completedAt': { $gte: thirtyDaysAgo },
    });

    return {
      total: needingFollowup.length,
      assigned: assigned.length,
      unassigned: unassigned.length,
      completedLast30Days: completed,
      list: needingFollowup.slice(0, 20),
    };
  }

  /**
   * Get detractor insights
   */
  async getDetractorInsights(filters = {}, dateRange = {}) {
    const detractors = await NPSScore.getDetractors(filters, dateRange);

    // Analyze common themes in feedback
    const themes = this.extractThemes(detractors);

    // Group by score
    const scoreDistribution = {};
    for (let i = 0; i <= 6; i += 1) {
      scoreDistribution[i] = detractors.filter((d) => d.score === i).length;
    }

    // Most common issues
    const issues = this.identifyIssues(detractors);

    return {
      total: detractors.length,
      scoreDistribution,
      themes,
      issues,
      recent: detractors.slice(0, 20),
    };
  }

  /**
   * Get promoter insights
   */
  async getPromoterInsights(filters = {}, dateRange = {}) {
    const promoters = await NPSScore.getPromoters(filters, dateRange);

    // Extract positive themes
    const themes = this.extractThemes(promoters);

    // Group by score
    const scoreDistribution = {
      9: promoters.filter((p) => p.score === 9).length,
      10: promoters.filter((p) => p.score === 10).length,
    };

    // Success factors
    const successFactors = this.identifySuccessFactors(promoters);

    return {
      total: promoters.length,
      scoreDistribution,
      themes,
      successFactors,
      recent: promoters.slice(0, 20),
    };
  }

  /**
   * Compare periods
   */
  async comparePeriods(filters, period1, period2) {
    const [nps1, nps2] = await Promise.all([
      NPSScore.calculateNPS(filters, period1),
      NPSScore.calculateNPS(filters, period2),
    ]);

    return {
      period1: { ...period1, ...nps1 },
      period2: { ...period2, ...nps2 },
      changes: {
        npsScore: nps1.npsScore - nps2.npsScore,
        promoters: nps1.promoters - nps2.promoters,
        detractors: nps1.detractors - nps2.detractors,
      },
    };
  }

  /**
   * Get response rate analysis
   */
  async getResponseRateAnalysis(organizationId, dateRange = {}) {
    const SurveyResponse = require('../models/SurveyResponse');

    const query = { organization: organizationId };
    if (dateRange.startDate) {
      query.sentAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.sentAt = { ...query.sentAt, $lte: dateRange.endDate };
    }

    const totalSent = await SurveyResponse.countDocuments(query);
    const totalCompleted = await SurveyResponse.countDocuments({
      ...query,
      status: 'completed',
    });

    const npsResponses = await NPSScore.countDocuments({
      organization: organizationId,
      submittedAt: query.sentAt,
    });

    return {
      totalSent,
      totalCompleted,
      npsResponses,
      responseRate: totalSent > 0 ? ((totalCompleted / totalSent) * 100).toFixed(1) : 0,
      npsResponseRate: totalSent > 0 ? ((npsResponses / totalSent) * 100).toFixed(1) : 0,
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Extract themes from feedback
   */
  extractThemes(scores) {
    const themeKeywords = {
      staff: ['staff', 'receptionist', 'nurse', 'friendly', 'rude', 'helpful', 'professional'],
      wait_time: ['wait', 'waiting', 'late', 'delay', 'time', 'appointment time'],
      facility: ['clean', 'dirty', 'facility', 'office', 'room', 'parking'],
      treatment: ['treatment', 'therapy', 'care', 'effective', 'results', 'pain'],
      communication: ['explain', 'communication', 'listen', 'understand', 'information'],
      cost: ['cost', 'expensive', 'price', 'billing', 'insurance', 'payment'],
    };

    const themeCounts = {};
    Object.keys(themeKeywords).forEach((theme) => {
      themeCounts[theme] = 0;
    });

    scores.forEach((score) => {
      const feedbackText = [
        score.feedback?.reason,
        score.feedback?.improvementSuggestions,
        score.feedback?.positiveComments,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some((keyword) => feedbackText.includes(keyword))) {
          themeCounts[theme]++;
        }
      });
    });

    return Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Identify common issues
   */
  identifyIssues(detractors) {
    const issues = [
      { issue: 'Long wait times', count: 0, severity: 'high' },
      { issue: 'Poor communication', count: 0, severity: 'high' },
      { issue: 'Unprofessional staff', count: 0, severity: 'critical' },
      { issue: 'Facility cleanliness', count: 0, severity: 'medium' },
      { issue: 'Treatment effectiveness', count: 0, severity: 'high' },
      { issue: 'Billing issues', count: 0, severity: 'medium' },
    ];

    detractors.forEach((d) => {
      const feedback = [d.feedback?.reason, d.feedback?.improvementSuggestions]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (feedback.includes('wait') || feedback.includes('late')) issues[0].count += 1;
      if (feedback.includes('communication') || feedback.includes('explain')) issues[1].count += 1;
      if (feedback.includes('rude') || feedback.includes('unprofessional')) issues[2].count += 1;
      if (feedback.includes('clean') || feedback.includes('dirty')) issues[3].count += 1;
      if (feedback.includes('treatment') || feedback.includes('pain')) issues[4].count += 1;
      if (feedback.includes('bill') || feedback.includes('cost')) issues[5].count += 1;
    });

    return issues.filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
  }

  /**
   * Identify success factors
   */
  identifySuccessFactors(promoters) {
    const factors = [
      { factor: 'Excellent staff', count: 0 },
      { factor: 'Effective treatment', count: 0 },
      { factor: 'Great communication', count: 0 },
      { factor: 'Clean facility', count: 0 },
      { factor: 'Professional care', count: 0 },
    ];

    promoters.forEach((p) => {
      const feedback = [p.feedback?.reason, p.feedback?.positiveComments]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (feedback.includes('staff') || feedback.includes('friendly')) factors[0].count += 1;
      if (
        feedback.includes('treatment') ||
        feedback.includes('effective') ||
        feedback.includes('results')
      )
        factors[1].count += 1;
      if (
        feedback.includes('communication') ||
        feedback.includes('explain') ||
        feedback.includes('listen')
      )
        factors[2].count += 1;
      if (feedback.includes('clean') || feedback.includes('facility')) factors[3].count += 1;
      if (feedback.includes('professional') || feedback.includes('care')) factors[4].count += 1;
    });

    return factors.filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  }
}

module.exports = new NPSAnalysisService();
