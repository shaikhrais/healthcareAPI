
const OnlineReview = require('../models/OnlineReview');
/**
 * Review Monitoring Service
 *
 * Aggregates and analyzes online reviews
 */

class ReviewMonitoringService {
  /**
   * Get comprehensive review dashboard
   */
  async getDashboard(organizationId, dateRange = {}) {
    const [stats, recentReviews, needingResponse, sentimentAnalysis, trendData, platformBreakdown] =
      await Promise.all([
        OnlineReview.getStats(organizationId, dateRange),
        this.getRecentReviews(organizationId, 10),
        OnlineReview.getNeedingResponse(organizationId),
        this.getSentimentAnalysis(organizationId, dateRange),
        OnlineReview.getTrend(organizationId, dateRange),
        this.getPlatformBreakdown(organizationId, dateRange),
      ]);

    return {
      stats,
      recentReviews,
      needingResponse: needingResponse.slice(0, 10),
      sentimentAnalysis,
      trendData,
      platformBreakdown,
    };
  }

  /**
   * Get recent reviews
   */
  async getRecentReviews(organizationId, limit = 20) {
    return await OnlineReview.find({ organization: organizationId })
      .populate('patientId', 'firstName lastName')
      .populate('practitionerId', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .sort({ publishedAt: -1 })
      .limit(limit);
  }

  /**
   * Get sentiment analysis
   */
  async getSentimentAnalysis(organizationId, dateRange = {}) {
    const query = { organization: organizationId };

    if (dateRange.startDate) {
      query.publishedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.publishedAt = { ...query.publishedAt, $lte: dateRange.endDate };
    }

    const reviews = await OnlineReview.find(query);

    const sentimentCounts = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0,
    };

    reviews.forEach((r) => {
      if (r.sentiment.overall) {
        sentimentCounts[r.sentiment.overall]++;
      }
    });

    // Extract common topics
    const topicCounts = {};
    reviews.forEach((r) => {
      if (r.sentiment.topics) {
        r.sentiment.topics.forEach((t) => {
          if (!topicCounts[t.topic]) {
            topicCounts[t.topic] = { positive: 0, negative: 0, neutral: 0 };
          }
          if (t.sentiment.includes('positive')) {
            topicCounts[t.topic].positive += 1;
          } else if (t.sentiment.includes('negative')) {
            topicCounts[t.topic].negative += 1;
          } else {
            topicCounts[t.topic].neutral += 1;
          }
        });
      }
    });

    return {
      sentimentDistribution: sentimentCounts,
      topicAnalysis: Object.entries(topicCounts)
        .map(([topic, counts]) => ({
          topic,
          ...counts,
          total: counts.positive + counts.negative + counts.neutral,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  /**
   * Get platform breakdown
   */
  async getPlatformBreakdown(organizationId, dateRange = {}) {
    const query = { organization: organizationId };

    if (dateRange.startDate) {
      query.publishedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.publishedAt = { ...query.publishedAt, $lte: dateRange.endDate };
    }

    const reviews = await OnlineReview.find(query);

    const platformStats = {};

    reviews.forEach((r) => {
      if (!platformStats[r.platform]) {
        platformStats[r.platform] = {
          count: 0,
          totalRating: 0,
          ratings: [],
        };
      }
      platformStats[r.platform].count += 1;
      platformStats[r.platform].totalRating += r.rating;
      platformStats[r.platform].ratings.push(r.rating);
    });

    return Object.entries(platformStats)
      .map(([platform, stats]) => ({
        platform,
        count: stats.count,
        avgRating: (stats.totalRating / stats.count).toFixed(2),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate response suggestion using AI/templates
   */
  generateResponseSuggestion(review) {
    const templates = {
      very_positive: `Thank you so much for your wonderful review! We're thrilled to hear about your positive experience${review.reviewer.name ? `, ${review.reviewer.name}` : ''}. Your feedback means the world to our team and motivates us to continue providing excellent care. We look forward to serving you again!`,

      positive: `Thank you for your positive feedback${review.reviewer.name ? `, ${review.reviewer.name}` : ''}! We're glad you had a good experience with us. If there's anything we can do to make your next visit even better, please don't hesitate to let us know.`,

      neutral: `Thank you for taking the time to review us${review.reviewer.name ? `, ${review.reviewer.name}` : ''}. We appreciate your feedback and would love to hear more about how we can improve your experience. Please feel free to contact us directly so we can address any concerns.`,

      negative: `We're sorry to hear about your experience${review.reviewer.name ? `, ${review.reviewer.name}` : ''}, and we appreciate you bringing this to our attention. Your feedback is important to us. We'd like to make this right - please contact us at [contact info] so we can discuss your concerns and find a solution.`,

      very_negative: `We sincerely apologize for your experience${review.reviewer.name ? `, ${review.reviewer.name}` : ''}. This is not the level of care we strive to provide. We take your concerns very seriously and would like to speak with you directly to resolve this issue. Please contact our practice manager at [contact info] at your earliest convenience.`,
    };

    return templates[review.sentiment.overall] || templates.neutral;
  }

  /**
   * Get review alerts
   */
  async getAlerts(organizationId) {
    const criticalReviews = await OnlineReview.find({
      organization: organizationId,
      priority: 'critical',
      alertSent: false,
    }).sort({ publishedAt: -1 });

    const needingResponse = await OnlineReview.find({
      organization: organizationId,
      'response.posted': false,
      rating: { $lte: 3 },
      publishedAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Last 48 hours
    }).sort({ publishedAt: -1 });

    return {
      critical: criticalReviews.length,
      needingResponseUrgent: needingResponse.length,
      reviews: [...criticalReviews, ...needingResponse].slice(0, 20),
    };
  }
}

module.exports = new ReviewMonitoringService();
