
const MigrationBase = require('../utils/MigrationBase');
const MigrationHelper = require('../utils/MigrationHelper');
/**
 * Migration: Add User Profile Fields
 * Created: 2024-01-15T10:00:00
 *
 * Purpose: Add additional profile fields to User model including
 * timezone, language preference, and profile completion status
 */

class AddUserProfileFields extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);

    this.version = '1.0.0';
    this.description = 'Add timezone, language, and profileComplete fields to User model';
    this.author = 'CloneJane Dev Team';
  }

  async validate() {
    // Check if User model exists
    if (!this.models.User) {
      this.log('User model not found', 'error');
      return false;
    }

    // Check if fields already exist
    const sample = await this.models.User.findOne({});
    if (sample && sample.profileComplete !== undefined) {
      this.log('Fields may already exist', 'warn');
    }

    return true;
  }

  async up() {
    this.log('Starting user profile fields migration');

    const { User } = this.models;

    // Get current stats
    const beforeStats = await this.getCollectionStats('users');
    this.log(`Processing ${beforeStats.count} users`);

    // Create backup
    const backupName = await this.backupCollection('users');

    try {
      // Add timezone field (default to EST)
      this.log('Adding timezone field...');
      const timezoneResult = await MigrationHelper.addField(User, 'timezone', 'America/New_York', {
        timezone: { $exists: false },
      });
      this.log(`Added timezone to ${timezoneResult.modified} users`);

      // Add language preference field
      this.log('Adding language field...');
      const languageResult = await MigrationHelper.addField(User, 'language', 'en', {
        language: { $exists: false },
      });
      this.log(`Added language to ${languageResult.modified} users`);

      // Add profile completion status
      this.log('Adding profileComplete field...');
      const profileResult = await MigrationHelper.addField(User, 'profileComplete', false, {
        profileComplete: { $exists: false },
      });
      this.log(`Added profileComplete to ${profileResult.modified} users`);

      // Calculate profile completion for existing users
      this.log('Calculating profile completion status...');
      const users = await User.find({ profileComplete: false });

      let completed = 0;
      for (const user of users) {
        // Consider profile complete if has: firstName, lastName, email, phone
        const isComplete = !!(user.firstName && user.lastName && user.email && user.phone);

        if (isComplete) {
          user.profileComplete = true;
          await user.save();
          completed += 1;
        }
      }

      this.log(`Marked ${completed} profiles as complete`, 'success');

      // Get final stats
      const afterStats = await this.getCollectionStats('users');

      // Drop backup on success
      await this.dropBackup(backupName);

      const result = {
        totalUsers: afterStats.count,
        timezoneAdded: timezoneResult.modified,
        languageAdded: languageResult.modified,
        profileCompleteAdded: profileResult.modified,
        profilesCompleted: completed,
      };

      this.log('Migration completed successfully', 'success');
      return result;
    } catch (err) {
      this.log(`Migration failed: ${err.message}`, 'error');

      // Restore from backup
      this.log('Restoring from backup...', 'warn');
      await this.restoreFromBackup('users', backupName);
      await this.dropBackup(backupName);

      throw err;
    }
  }

  async down() {
    this.log('Rolling back user profile fields migration');

    const { User } = this.models;

    // Create backup before rollback
    const backupName = await this.backupCollection('users');

    try {
      // Remove added fields
      this.log('Removing timezone field...');
      const timezoneResult = await MigrationHelper.removeField(User, 'timezone');

      this.log('Removing language field...');
      const languageResult = await MigrationHelper.removeField(User, 'language');

      this.log('Removing profileComplete field...');
      const profileResult = await MigrationHelper.removeField(User, 'profileComplete');

      // Drop backup on success
      await this.dropBackup(backupName);

      const result = {
        timezoneRemoved: timezoneResult.modified,
        languageRemoved: languageResult.modified,
        profileCompleteRemoved: profileResult.modified,
      };

      this.log('Rollback completed successfully', 'success');
      return result;
    } catch (err) {
      this.log(`Rollback failed: ${err.message}`, 'error');

      // Restore from backup
      await this.restoreFromBackup('users', backupName);
      await this.dropBackup(backupName);

      throw err;
    }
  }
}

module.exports = AddUserProfileFields;
