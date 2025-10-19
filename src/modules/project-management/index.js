/**
 * Project Management Module Index
 * Entry point for project management functionality
 */

const projectRoutes = require('./routes/projectRoutes');
const ProjectModule = require('./models/ProjectModule');
const ProjectProfile = require('./models/ProjectProfile');
const projectManagementService = require('./services/projectManagementService');

module.exports = {
  routes: projectRoutes,
  models: {
    ProjectModule,
    ProjectProfile
  },
  services: {
    projectManagementService
  },
  
  // Initialize project management
  async initialize() {
    try {
      console.log('Initializing Project Management module...');
      
      // Create default project profile if none exists
      const existingProfile = await ProjectProfile.findOne();
      if (!existingProfile) {
        const defaultProfile = new ProjectProfile({
          projectName: 'Healthcare API',
          projectId: `healthcare_${Date.now()}`,
          basicInfo: {
            description: 'Comprehensive Healthcare Management API',
            version: '1.0.0',
            status: 'Development',
            environment: 'Development'
          }
        });
        
        await defaultProfile.save();
        console.log('Created default project profile');
      }
      
      // Auto-register current project if no modules exist
      const moduleCount = await ProjectModule.countDocuments();
      if (moduleCount === 0) {
        console.log('No modules found, starting auto-registration...');
        await projectManagementService.autoRegisterProject();
        console.log('Auto-registration completed');
      }
      
      console.log('Project Management module initialized successfully');
    } catch (error) {
      console.error('Error initializing Project Management module:', error);
    }
  }
};