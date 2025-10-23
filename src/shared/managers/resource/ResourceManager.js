/**
 * ResourceManager
 * Checks and manages system resources (images, documents, etc.) required by the application.
 */
const fs = require('fs');
const path = require('path');



const Resource = require('../../../modules/project-management/models/Resource');
const DBResourceManager = require('./submanagers/DBResourceManager');
const FileResourceManager = require('./submanagers/FileResourceManager');
const ImageResourceManager = require('./submanagers/ImageResourceManager');
const ComponentResourceManager = require('./submanagers/ComponentResourceManager');
const ScreenResourceManager = require('./submanagers/ScreenResourceManager');
const APIResourceManager = require('./submanagers/APIResourceManager');
const ServiceResourceManager = require('./submanagers/ServiceResourceManager');
const ConfigResourceManager = require('./submanagers/ConfigResourceManager');
const LicenseResourceManager = require('./submanagers/LicenseResourceManager');
const FontResourceManager = require('./submanagers/FontResourceManager');
const VideoResourceManager = require('./submanagers/VideoResourceManager');
const ThirdPartyResourceManager = require('./submanagers/ThirdPartyResourceManager');
const EnvironmentResourceManager = require('./submanagers/EnvironmentResourceManager');
const UserContentResourceManager = require('./submanagers/UserContentResourceManager');
const BackupManager = require('../../backup/BackupManager');

class ResourceManager {
  static async fullInventory() {
    // Aggregate all sub-managers
    const [
      db,
      files,
      images,
      components,
      screens,
      apis,
      services,
      configs,
      licenses,
      fonts,
      videos,
      thirdParty,
      environments,
      userContent,
      backups
    ] = await Promise.all([
      DBResourceManager.inventory(),
      FileResourceManager.inventory(),
      ImageResourceManager.inventory(),
      ComponentResourceManager.inventory(),
      ScreenResourceManager.inventory(),
      APIResourceManager.inventory(),
      ServiceResourceManager.inventory(),
      ConfigResourceManager.inventory(),
      LicenseResourceManager.inventory(),
      FontResourceManager.inventory(),
      VideoResourceManager.inventory(),
      ThirdPartyResourceManager.inventory(),
      EnvironmentResourceManager.inventory(),
      UserContentResourceManager.inventory(),
      BackupManager.inventory()
    ]);
    return {
      db,
      files,
      images,
      components,
      screens,
      apis,
      services,
      configs,
      licenses,
      fonts,
      videos,
      thirdParty,
      environments,
      userContent,
      backups
    };

  static requiredResources = [
    { type: 'image', name: 'logo.png', path: path.join(__dirname, '../../../public/images/logo.png') },
    { type: 'document', name: 'terms.pdf', path: path.join(__dirname, '../../../public/docs/terms.pdf') },
    // Add more resources as needed
  ];

  static async verifyAndRecordResources() {
    class ResourceManager {
      static requiredResources = [
        { type: 'image', name: 'logo.png', path: path.join(__dirname, '../../../public/images/logo.png') },
        { type: 'document', name: 'terms.pdf', path: path.join(__dirname, '../../../public/docs/terms.pdf') },
        // Add more resources as needed
      ];

      static async fullInventory() {
        // Aggregate all sub-managers
        const [
          db,
          files,
          images,
          components,
          screens,
          apis,
          services,
          configs,
          licenses,
          fonts,
          videos,
          thirdParty,
          environments,
          userContent,
          backups
        ] = await Promise.all([
          DBResourceManager.inventory(),
          FileResourceManager.inventory(),
          ImageResourceManager.inventory(),
          ComponentResourceManager.inventory(),
          ScreenResourceManager.inventory(),
          APIResourceManager.inventory(),
          ServiceResourceManager.inventory(),
          ConfigResourceManager.inventory(),
          LicenseResourceManager.inventory(),
          FontResourceManager.inventory(),
          VideoResourceManager.inventory(),
          ThirdPartyResourceManager.inventory(),
          EnvironmentResourceManager.inventory(),
          UserContentResourceManager.inventory(),
          BackupManager.inventory()
        ]);
        return {
          db,
          files,
          images,
          components,
          screens,
          apis,
          services,
          configs,
          licenses,
          fonts,
          videos,
          thirdParty,
          environments,
          userContent,
          backups
        };
      }

      static async verifyAndRecordResources() {
        for (const resource of this.requiredResources) {
          const exists = fs.existsSync(resource.path);
          await Resource.findOneAndUpdate(
            { name: resource.name, type: resource.type },
            {
              name: resource.name,
              type: resource.type,
              path: resource.path,
              exists,
              lastChecked: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }

      static checkResources() {
        const missing = [];
        for (const resource of this.requiredResources) {
          if (!fs.existsSync(resource.path)) {
            missing.push(resource);
          }
        }
        return missing;
      }

      static logResourceStatus() {
        const missing = this.checkResources();
        if (missing.length === 0) {
          console.log('✅ All required resources are present.');
        } else {
          console.error('❌ Missing required resources:');
          missing.forEach(r => {
            console.error(`   - [${r.type}] ${r.name} (${r.path})`);
          });
        }
        return missing.length === 0;
      }
    }
