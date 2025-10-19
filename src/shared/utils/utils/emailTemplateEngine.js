const fs = require('fs').promises;
const path = require('path');

/**
 * Email Template Engine
 *
 * Simple template engine for rendering email templates with variables
 */

class EmailTemplateEngine {
  constructor(templatesDir) {
    this.templatesDir = templatesDir || path.join(__dirname, '..', 'templates', 'emails');
    this.cache = new Map();
    this.cacheEnabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Replace template variables with actual values
   * Supports: {{variable}}, {{user.name}}, etc.
   */
  render(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Get nested object value by dot notation
   * Example: 'user.name' from { user: { name: 'John' } }
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Load template from file
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.cacheEnabled && this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.html`);

    try {
      const template = await fs.readFile(templatePath, 'utf-8');

      // Cache the template
      if (this.cacheEnabled) {
        this.cache.set(templateName, template);
      }

      return template;
    } catch (err) {
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Render a template with data
   */
  async renderTemplate(templateName, data) {
    const template = await this.loadTemplate(templateName);
    return this.render(template, data);
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Create email object with subject and body
   */
  async createEmail(templateName, data, subject) {
    const html = await this.renderTemplate(templateName, data);
    const text = this.htmlToText(html);

    return {
      subject: this.render(subject, data),
      html,
      text,
    };
  }

  /**
   * Convert HTML to plain text (simple version)
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Inline CSS styles (for better email client compatibility)
   */
  inlineStyles(html, styles) {
    // Simple implementation - for production, consider using a library like 'juice'
    return html.replace('</head>', `<style>${styles}</style></head>`);
  }
}

module.exports = EmailTemplateEngine;
