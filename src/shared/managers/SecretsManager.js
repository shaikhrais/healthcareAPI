/**
 * SecretsManager
 * Secure secret retrieval and caching (Key Vault/Parameter Store ready).
 */
const secrets = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
};

const SecretsManager = {
  get(key) {
    return secrets[key];
  },
  set(key, value) {
    secrets[key] = value;
  },
  getAll() {
    return { ...secrets };
  },
};

module.exports = SecretsManager;