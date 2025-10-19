
const SurveyResponse = require('../models/SurveyResponse');
const PatientSurvey = require('../models/PatientSurvey');
/**
 * Survey Analysis Service
 *
 * Analyzes patient survey responses and generates insights
 */

class SurveyAnalysisService {
  /**
   * Get comprehensive survey analytics
   */
  async getComprehensiveAnalytics(surveyId, dateRange = {}) {
    const [
      basicStats,
      npsAnalysis,
      categoryBreakdown,
      trendData,
      textAnalysis,
      demographicBreakdown,
    ] = await Promise.all([
      this.getBasicStats(surveyId, dateRange),
      this.getNPSAnalysis(surveyId, dateRange),
      this.getCategoryBreakdown(surveyId, dateRange),
      this.getTrendData(surveyId, dateRange),
      this.getTextAnalysis(surveyId, dateRange),
      this.getDemographicBreakdown(surveyId, dateRange),
    ]);

    return {
      basicStats,
      npsAnalysis,
      categoryBreakdown,
      trendData,
      textAnalysis,
      demographicBreakdown,
    };
  }

  /**
   * Get basic statistics
   */
  async getBasicStats(surveyId, dateRange = {}) {
    return await SurveyResponse.getStats(surveyId, dateRange);
  }

  /**
   * Get NPS analysis
   */
  async getNPSAnalysis(surveyId, dateRange = {}) {
    return await SurveyResponse.calculateNPS(surveyId, dateRange);
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(surveyId, dateRange = {}) {
    const survey = await PatientSurvey.findById(surveyId);
    if (!survey) return [];

    const query = {
      surveyId,
      status: 'completed',
    };

    if (dateRange.startDate) {
      query.completedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
    }

    const responses = await SurveyResponse.find(query);

    const categories = [...new Set(survey.questions.map((q) => q.category))];
    const breakdown = [];

    categories.forEach((category) => {
      const categoryScores = responses
        .map((r) => r.scores.categoryScores.find((cs) => cs.category === category))
        .filter((cs) => cs)
        .map((cs) => cs.score);

      if (categoryScores.length > 0) {
        breakdown.push({
          category,
          avgScore: categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length,
          responseCount: categoryScores.length,
          distribution: this.calculateDistribution(categoryScores),
        });
      }
    });

    return breakdown.sort((a, b) => b.avgScore - a.avgScore);
  }

  /**
   * Get trend data over time
   */
  async getTrendData(surveyId, dateRange = {}) {
    const query = {
      surveyId,
      status: 'completed',
    };

    if (dateRange.startDate) {
      query.completedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
    }

    const responses = await SurveyResponse.find(query).sort({ completedAt: 1 });

    // Group by week
    const weeklyData = {};

    responses.forEach((response) => {
      const weekStart = this.getWeekStart(response.completedAt);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          responses: [],
          scores: [],
          npsScores: [],
        };
      }

      weeklyData[weekKey].responses.push(response);
      if (response.scores.overall) weeklyData[weekKey].scores.push(response.scores.overall);
      if (response.scores.nps !== undefined)
        weeklyData[weekKey].npsScores.push(response.scores.nps);
    });

    const trendArray = Object.values(weeklyData).map((week) => ({
      week: week.week,
      responseCount: week.responses.length,
      avgScore:
        week.scores.length > 0
          ? week.scores.reduce((sum, s) => sum + s, 0) / week.scores.length
          : null,
      nps: week.npsScores.length > 0 ? this.calculateNPSFromScores(week.npsScores) : null,
    }));

    return trendArray;
  }

  /**
   * Get text response analysis
   */
  async getTextAnalysis(surveyId, dateRange = {}) {
    const query = {
      surveyId,
      status: 'completed',
    };

    if (dateRange.startDate) {
      query.completedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
    }

    const responses = await SurveyResponse.find(query);

    const textResponses = [];
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };

    responses.forEach((response) => {
      if (response.sentiment.overall) {
        sentimentCounts[response.sentiment.overall]++;
      }

      response.answers
        .filter((a) => a.questionType === 'text' && a.textResponse)
        .forEach((a) => {
          textResponses.push({
            questionId: a.questionId,
            questionText: a.questionText,
            response: a.textResponse,
            sentiment: response.sentiment.overall,
            score: response.scores.overall,
          });
        });
    });

    return {
      totalTextResponses: textResponses.length,
      sentimentDistribution: sentimentCounts,
      recentResponses: textResponses.slice(-20),
    };
  }

  /**
   * Get demographic breakdown
   */
  async getDemographicBreakdown(surveyId, dateRange = {}) {
    const query = {
      surveyId,
      status: 'completed',
      patientId: { $exists: true },
    };

    if (dateRange.startDate) {
      query.completedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
    }

    const responses = await SurveyResponse.find(query).populate('patientId');

    // Device breakdown
    const deviceCounts = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
    responses.forEach((r) => {
      if (r.device) deviceCounts[r.device]++;
    });

    return {
      deviceDistribution: deviceCounts,
      totalResponses: responses.length,
    };
  }

  /**
   * Get question-specific analysis
   */
  async getQuestionAnalysis(surveyId, questionId, dateRange = {}) {
    const survey = await PatientSurvey.findById(surveyId);
    if (!survey) return null;

    const question = survey.questions.find((q) => q.questionId === questionId);
    if (!question) return null;

    const query = {
      surveyId,
      status: 'completed',
      'answers.questionId': questionId,
    };

    if (dateRange.startDate) {
      query.completedAt = { $gte: dateRange.startDate };
    }
    if (dateRange.endDate) {
      query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
    }

    const responses = await SurveyResponse.find(query);

    const answers = responses
      .map((r) => r.answers.find((a) => a.questionId === questionId))
      .filter((a) => a);

    if (question.questionType === 'rating' || question.questionType === 'nps') {
      const values = answers.map((a) => a.value).filter((v) => typeof v === 'number');

      return {
        questionId,
        questionText: question.questionText,
        questionType: question.questionType,
        totalResponses: answers.length,
        avgValue: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
        distribution: this.calculateValueDistribution(values, question.ratingScale),
      };
    }
    if (question.questionType === 'multiple_choice' || question.questionType === 'yes_no') {
      const valueCounts = {};
      answers.forEach((a) => {
        const val = Array.isArray(a.value) ? a.value : [a.value];
        val.forEach((v) => {
          valueCounts[v] = (valueCounts[v] || 0) + 1;
        });
      });

      return {
        questionId,
        questionText: question.questionText,
        questionType: question.questionType,
        totalResponses: answers.length,
        distribution: Object.entries(valueCounts).map(([value, count]) => ({
          value,
          count,
          percentage: (count / answers.length) * 100,
        })),
      };
    }
    // Text questions
    return {
      questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      totalResponses: answers.length,
      responses: answers.slice(-50).map((a) => ({
        text: a.textResponse,
        answeredAt: a.answeredAt,
      })),
    };
  }

  // ==================== UTILITY METHODS ====================

  calculateDistribution(scores) {
    const bins = [0, 20, 40, 60, 80, 100];
    const distribution = {};

    bins.forEach((bin, i) => {
      if (i < bins.length - 1) {
        const range = `${bin}-${bins[i + 1]}`;
        distribution[range] = scores.filter((s) => s >= bin && s < bins[i + 1]).length;
      }
    });

    return distribution;
  }

  calculateValueDistribution(values, ratingScale) {
    const distribution = {};
    const { min, max } = ratingScale;

    for (let i = min; i <= max; i += 1) {
      distribution[i] = values.filter((v) => v === i).length;
    }

    return distribution;
  }

  calculateNPSFromScores(npsScores) {
    const promoters = npsScores.filter((score) => score >= 9).length;
    const detractors = npsScores.filter((score) => score <= 6).length;
    return ((promoters - detractors) / npsScores.length) * 100;
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}

module.exports = new SurveyAnalysisService();
