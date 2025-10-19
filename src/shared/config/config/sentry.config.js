const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

const config = require('./env.config');
/**
 * Sentry Error Monitoring Configuration
 */

/**
 * Initialize Sentry
 */
function initializeSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping error monitoring setup');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.env,
    release: `expojane-api@${require('../package.json').version}`,

    // Performance Monitoring
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: config.isProduction ? 0.1 : 1.0,
    integrations: [new ProfilingIntegration()],

    // Error filtering
    beforeSend(event, hint) {
      // Don't send certain errors to Sentry
      if (event.exception) {
        const error = hint.originalException;

        // Ignore 404 errors
        if (error && error.status === 404) {
          return null;
        }

        // Ignore validation errors
        if (error && error.name === 'ValidationError') {
          return null;
        }
      }

      return event;
    },
  });

  // Request handler must be the first middleware
  if (app) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  console.log('✓ Sentry error monitoring initialized');
}

/**
 * Get error handler middleware (must be used before other error handlers)
 */
function errorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      if (error.status && error.status >= 500) {
        return true;
      }
      return false;
    },
  });
}

/**
 * Capture exception manually
 */
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message
 */
function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

module.exports = {
  initializeSentry,
  errorHandler,
  captureException,
  captureMessage,
  Sentry,
};
