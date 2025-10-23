/**
 * FeatureFlagManager
 * Runtime feature toggles (local or remote config ready).
 */
const flags = {
  enableNewDashboard: false,
  enableBetaFeatures: false,
};

const FeatureFlagManager = {
  isEnabled(flag) {
    return !!flags[flag];
  },
  setFlag(flag, value) {
    flags[flag] = !!value;
  },
  getAll() {
    return { ...flags };
  },
};

module.exports = FeatureFlagManager;