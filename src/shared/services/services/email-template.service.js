/**
 * Email Template Service
 *
 * Generates HTML email templates for executive summaries
 * Features:
 * - Multiple template styles (executive, detailed, minimal)
 * - Responsive design
 * - Customizable branding
 * - Section-based composition
 */

class EmailTemplateService {
  /**
   * Generate executive summary email HTML
   */
  generateExecutiveSummary(data, config = {}) {
    const {
      dateRange,
      comparisonRange,
      metrics,
      comparisonMetrics,
      sections,
      branding = {},
    } = data;

    const { logo = '', primaryColor = '#00C1CA', secondaryColor = '#333333' } = branding;

    const template = config.template || 'executive';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Summary</title>
  <style>
    ${this.getBaseStyles(primaryColor, secondaryColor)}
  </style>
</head>
<body>
  <div class="email-container">
    ${this.renderHeader(logo, dateRange, primaryColor)}

    <div class="content">
      ${this.renderOverview(sections, metrics, comparisonMetrics)}

      ${sections.includes('revenue') ? this.renderRevenue(metrics.revenue, comparisonMetrics?.revenue) : ''}

      ${sections.includes('appointments') ? this.renderAppointments(metrics.appointments, comparisonMetrics?.appointments) : ''}

      ${sections.includes('practitioners') ? this.renderPractitioners(metrics.practitioners) : ''}

      ${sections.includes('patients') ? this.renderPatients(metrics.patients, comparisonMetrics?.patients) : ''}

      ${sections.includes('services') ? this.renderServices(metrics.services) : ''}

      ${sections.includes('churn_risk') ? this.renderChurnRisk(metrics.churnRisk) : ''}

      ${sections.includes('anomalies') ? this.renderAnomalies(metrics.anomalies) : ''}

      ${sections.includes('trends') ? this.renderTrends(metrics.trends) : ''}

      ${sections.includes('top_performers') ? this.renderTopPerformers(metrics.topPerformers) : ''}

      ${sections.includes('action_items') ? this.renderActionItems(metrics.actionItems) : ''}
    </div>

    ${this.renderFooter(primaryColor)}
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Get base CSS styles
   */
  getBaseStyles(primaryColor, secondaryColor) {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f5f5f5;
        padding: 20px;
      }

      .email-container {
        max-width: 800px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .header {
        background: linear-gradient(135deg, ${primaryColor} 0%, ${this.adjustColorBrightness(primaryColor, -20)} 100%);
        color: #ffffff;
        padding: 30px;
        text-align: center;
      }

      .header h1 {
        font-size: 28px;
        margin-bottom: 10px;
        font-weight: 600;
      }

      .header .date-range {
        font-size: 16px;
        opacity: 0.9;
      }

      .content {
        padding: 30px;
      }

      .section {
        margin-bottom: 30px;
      }

      .section-title {
        font-size: 20px;
        color: ${secondaryColor};
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid ${primaryColor};
        font-weight: 600;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .metric-card {
        background-color: #f9f9f9;
        border-left: 4px solid ${primaryColor};
        padding: 15px;
        border-radius: 4px;
      }

      .metric-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: ${secondaryColor};
        margin-bottom: 5px;
      }

      .metric-change {
        font-size: 12px;
        font-weight: 600;
      }

      .metric-change.positive {
        color: #4CAF50;
      }

      .metric-change.negative {
        color: #F44336;
      }

      .metric-change.neutral {
        color: #999;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }

      .table th {
        background-color: #f5f5f5;
        color: ${secondaryColor};
        font-weight: 600;
        padding: 12px;
        text-align: left;
        border-bottom: 2px solid ${primaryColor};
      }

      .table td {
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;
      }

      .table tr:last-child td {
        border-bottom: none;
      }

      .alert-box {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 15px 0;
        border-radius: 4px;
      }

      .alert-box.critical {
        background-color: #f8d7da;
        border-left-color: #f44336;
      }

      .alert-box.success {
        background-color: #d4edda;
        border-left-color: #4caf50;
      }

      .action-item {
        background-color: #e3f2fd;
        border-left: 4px solid #2196f3;
        padding: 12px;
        margin: 10px 0;
        border-radius: 4px;
      }

      .footer {
        background-color: #f5f5f5;
        padding: 20px 30px;
        text-align: center;
        font-size: 12px;
        color: #999;
      }

      .footer a {
        color: ${primaryColor};
        text-decoration: none;
      }

      .chart-placeholder {
        background-color: #f5f5f5;
        border: 1px dashed #ccc;
        padding: 40px;
        text-align: center;
        color: #999;
        margin: 15px 0;
        border-radius: 4px;
      }

      @media only screen and (max-width: 600px) {
        .metric-grid {
          grid-template-columns: 1fr;
        }

        .table {
          font-size: 12px;
        }

        .table th,
        .table td {
          padding: 8px;
        }
      }
    `;
  }

  /**
   * Render email header
   */
  renderHeader(logo, dateRange, primaryColor) {
    const { startDate, endDate } = dateRange;
    const dateStr = this.formatDateRange(startDate, endDate);

    return `
      <div class="header">
        ${logo ? `<img src="${logo}" alt="Logo" style="max-width: 150px; margin-bottom: 15px;">` : ''}
        <h1>Executive Summary</h1>
        <div class="date-range">${dateStr}</div>
      </div>
    `;
  }

  /**
   * Render overview section
   */
  renderOverview(sections, metrics, comparisonMetrics) {
    if (!sections.includes('overview') || !metrics.overview) return '';

    const { overview } = metrics;
    const comparison = comparisonMetrics?.overview;

    return `
      <div class="section">
        <h2 class="section-title">📊 Overview</h2>
        <div class="metric-grid">
          ${this.renderMetricCard('Total Revenue', this.formatCurrency(overview.revenue), comparison?.revenue)}
          ${this.renderMetricCard('Appointments', overview.appointments, comparison?.appointments)}
          ${this.renderMetricCard('New Patients', overview.newPatients, comparison?.newPatients)}
          ${this.renderMetricCard('Avg. Revenue/Appt', this.formatCurrency(overview.avgRevenuePerAppointment), comparison?.avgRevenuePerAppointment)}
        </div>
      </div>
    `;
  }

  /**
   * Render revenue section
   */
  renderRevenue(revenue, comparison) {
    if (!revenue) return '';

    return `
      <div class="section">
        <h2 class="section-title">💰 Revenue Analysis</h2>
        <div class="metric-grid">
          ${this.renderMetricCard('Total Revenue', this.formatCurrency(revenue.total), comparison?.total)}
          ${this.renderMetricCard('Collected', this.formatCurrency(revenue.collected), comparison?.collected)}
          ${this.renderMetricCard('Outstanding', this.formatCurrency(revenue.outstanding), comparison?.outstanding)}
          ${this.renderMetricCard('Avg. Transaction', this.formatCurrency(revenue.avgTransaction), comparison?.avgTransaction)}
        </div>

        ${
          revenue.byPaymentMethod
            ? `
          <table class="table">
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${revenue.byPaymentMethod
                .map(
                  (pm) => `
                <tr>
                  <td>${pm.method}</td>
                  <td>${this.formatCurrency(pm.amount)}</td>
                  <td>${pm.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Render appointments section
   */
  renderAppointments(appointments, comparison) {
    if (!appointments) return '';

    return `
      <div class="section">
        <h2 class="section-title">📅 Appointments</h2>
        <div class="metric-grid">
          ${this.renderMetricCard('Total', appointments.total, comparison?.total)}
          ${this.renderMetricCard('Completed', appointments.completed, comparison?.completed)}
          ${this.renderMetricCard('Cancelled', appointments.cancelled, comparison?.cancelled)}
          ${this.renderMetricCard('No-Show Rate', appointments.noShowRate.toFixed(1) + '%', comparison?.noShowRate)}
        </div>

        ${
          appointments.byStatus
            ? `
          <table class="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.byStatus
                .map(
                  (status) => `
                <tr>
                  <td>${status.status}</td>
                  <td>${status.count}</td>
                  <td>${status.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Render practitioners section
   */
  renderPractitioners(practitioners) {
    if (!practitioners || !practitioners.list) return '';

    return `
      <div class="section">
        <h2 class="section-title">👨‍⚕️ Practitioner Performance</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Practitioner</th>
              <th>Appointments</th>
              <th>Revenue</th>
              <th>Utilization</th>
            </tr>
          </thead>
          <tbody>
            ${practitioners.list
              .map(
                (p) => `
              <tr>
                <td>${p.name}</td>
                <td>${p.appointments}</td>
                <td>${this.formatCurrency(p.revenue)}</td>
                <td>${p.utilization.toFixed(1)}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render patients section
   */
  renderPatients(patients, comparison) {
    if (!patients) return '';

    return `
      <div class="section">
        <h2 class="section-title">👥 Patient Metrics</h2>
        <div class="metric-grid">
          ${this.renderMetricCard('Active Patients', patients.active, comparison?.active)}
          ${this.renderMetricCard('New Patients', patients.new, comparison?.new)}
          ${this.renderMetricCard('Returning Rate', patients.returningRate.toFixed(1) + '%', comparison?.returningRate)}
          ${this.renderMetricCard('Avg. Visits', patients.avgVisits.toFixed(1), comparison?.avgVisits)}
        </div>
      </div>
    `;
  }

  /**
   * Render services section
   */
  renderServices(services) {
    if (!services || !services.list) return '';

    return `
      <div class="section">
        <h2 class="section-title">🏥 Service Performance</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Appointments</th>
              <th>Revenue</th>
              <th>Avg. Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${services.list
              .slice(0, 10)
              .map(
                (s) => `
              <tr>
                <td>${s.name}</td>
                <td>${s.appointments}</td>
                <td>${this.formatCurrency(s.revenue)}</td>
                <td>${this.formatCurrency(s.avgRevenue)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render churn risk section
   */
  renderChurnRisk(churnRisk) {
    if (!churnRisk || !churnRisk.patients) return '';

    return `
      <div class="section">
        <h2 class="section-title">⚠️ Churn Risk</h2>
        <div class="alert-box critical">
          <strong>${churnRisk.criticalCount} patients at critical risk</strong>
          <p>Immediate intervention recommended</p>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Risk Level</th>
              <th>Risk Score</th>
              <th>Last Visit</th>
            </tr>
          </thead>
          <tbody>
            ${churnRisk.patients
              .slice(0, 10)
              .map(
                (p) => `
              <tr>
                <td>${p.name}</td>
                <td><span style="color: ${this.getRiskColor(p.riskLevel)}">${p.riskLevel}</span></td>
                <td>${p.riskScore}/100</td>
                <td>${this.formatDate(p.lastVisit)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render anomalies section
   */
  renderAnomalies(anomalies) {
    if (!anomalies || !anomalies.list || anomalies.list.length === 0) {
      return `
        <div class="section">
          <h2 class="section-title">🔍 Anomalies</h2>
          <div class="alert-box success">
            <strong>No significant anomalies detected</strong>
            <p>All metrics are within expected ranges</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2 class="section-title">🔍 Anomalies Detected</h2>
        ${anomalies.list
          .map(
            (a) => `
          <div class="alert-box ${a.severity === 'Critical' ? 'critical' : ''}">
            <strong>${a.title}</strong> - ${a.severity}
            <p>${a.description}</p>
            <small>${this.formatDate(a.detectedAt)}</small>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render trends section
   */
  renderTrends(trends) {
    if (!trends) return '';

    return `
      <div class="section">
        <h2 class="section-title">📈 Trends</h2>
        <div class="metric-grid">
          ${trends.revenue ? this.renderTrendCard('Revenue Trend', trends.revenue.direction, trends.revenue.change) : ''}
          ${trends.appointments ? this.renderTrendCard('Appointments Trend', trends.appointments.direction, trends.appointments.change) : ''}
          ${trends.newPatients ? this.renderTrendCard('New Patients Trend', trends.newPatients.direction, trends.newPatients.change) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render top performers section
   */
  renderTopPerformers(topPerformers) {
    if (!topPerformers) return '';

    return `
      <div class="section">
        <h2 class="section-title">⭐ Top Performers</h2>

        ${
          topPerformers.practitioners
            ? `
          <h3 style="margin-bottom: 10px; color: #666; font-size: 16px;">Practitioners</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Revenue</th>
                <th>Appointments</th>
              </tr>
            </thead>
            <tbody>
              ${topPerformers.practitioners
                .map(
                  (p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${p.name}</td>
                  <td>${this.formatCurrency(p.revenue)}</td>
                  <td>${p.appointments}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }

        ${
          topPerformers.services
            ? `
          <h3 style="margin: 20px 0 10px; color: #666; font-size: 16px;">Services</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Service</th>
                <th>Revenue</th>
                <th>Appointments</th>
              </tr>
            </thead>
            <tbody>
              ${topPerformers.services
                .map(
                  (s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${s.name}</td>
                  <td>${this.formatCurrency(s.revenue)}</td>
                  <td>${s.appointments}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Render action items section
   */
  renderActionItems(actionItems) {
    if (!actionItems || !actionItems.length) return '';

    return `
      <div class="section">
        <h2 class="section-title">✅ Recommended Actions</h2>
        ${actionItems
          .map(
            (item) => `
          <div class="action-item">
            <strong>${item.title}</strong>
            <p>${item.description}</p>
            ${item.priority ? `<small style="color: ${this.getPriorityColor(item.priority)}">Priority: ${item.priority}</small>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render footer
   */
  renderFooter(primaryColor) {
    return `
      <div class="footer">
        <p>This is an automated executive summary generated by ExpoJane</p>
        <p>
          <a href="#">View Full Dashboard</a> |
          <a href="#">Manage Preferences</a> |
          <a href="#">Unsubscribe</a>
        </p>
        <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} ExpoJane. All rights reserved.</p>
      </div>
    `;
  }

  /**
   * Render metric card
   */
  renderMetricCard(label, value, comparisonValue) {
    let changeHtml = '';

    if (comparisonValue !== undefined && comparisonValue !== null) {
      const numValue =
        typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
      const numComparison =
        typeof comparisonValue === 'string'
          ? parseFloat(comparisonValue.replace(/[^0-9.-]+/g, ''))
          : comparisonValue;

      const change = ((numValue - numComparison) / numComparison) * 100;
      const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';

      changeHtml = `<div class="metric-change ${changeClass}">${arrow} ${Math.abs(change).toFixed(1)}% vs. previous period</div>`;
    }

    return `
      <div class="metric-card">
        <div class="metric-label">${label}</div>
        <div class="metric-value">${value}</div>
        ${changeHtml}
      </div>
    `;
  }

  /**
   * Render trend card
   */
  renderTrendCard(label, direction, change) {
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
    const color = direction === 'up' ? '#4CAF50' : direction === 'down' ? '#F44336' : '#999';

    return `
      <div class="metric-card">
        <div class="metric-label">${label}</div>
        <div class="metric-value" style="color: ${color}">${arrow} ${change.toFixed(1)}%</div>
      </div>
    `;
  }

  // ==================== UTILITY METHODS ====================

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  getRiskColor(level) {
    const colors = {
      Critical: '#F44336',
      High: '#FF9800',
      Medium: '#FFC107',
      Low: '#4CAF50',
    };
    return colors[level] || '#999';
  }

  getPriorityColor(priority) {
    const colors = {
      High: '#F44336',
      Medium: '#FF9800',
      Low: '#4CAF50',
    };
    return colors[priority] || '#999';
  }

  adjustColorBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }
}

module.exports = new EmailTemplateService();
