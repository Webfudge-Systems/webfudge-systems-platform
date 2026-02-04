/**
 * Seed script for Apps and Modules
 * Run this after initial Strapi setup
 */

const seedData = {
  apps: [
    {
      name: 'CRM',
      slug: 'crm',
      description: 'Complete Customer Relationship Management solution',
      category: 'Sales & Marketing',
      basePrice: 49.00,
      icon: '👥',
      color: 'teal',
      order: 1,
      isActive: true,
      features: [
        'Lead Management',
        'Contact Database',
        'Deal Pipeline',
        'Sales Reports',
        'Email Integration'
      ],
      modules: [
        {
          name: 'Core Features',
          slug: 'crm-core',
          description: 'Essential CRM features including contacts and companies',
          pricePerUser: 5.00,
          isCore: true,
          order: 1,
          icon: '⚙️',
          features: ['Contact Management', 'Company Database', 'Basic Reporting']
        },
        {
          name: 'Leads Management',
          slug: 'crm-leads',
          description: 'Track and manage your sales leads',
          pricePerUser: 10.00,
          isCore: true,
          order: 2,
          icon: '🎯',
          features: ['Lead Capture', 'Lead Scoring', 'Lead Assignment', 'Conversion Tracking']
        },
        {
          name: 'Pipeline',
          slug: 'crm-pipeline',
          description: 'Visual deal pipeline and sales tracking',
          pricePerUser: 15.00,
          isCore: true,
          order: 3,
          icon: '📊',
          features: ['Kanban Board', 'Deal Stages', 'Win/Loss Analysis', 'Forecasting']
        },
        {
          name: 'Reports & Analytics',
          slug: 'crm-reports',
          description: 'Advanced reporting and analytics',
          pricePerUser: 8.00,
          isCore: false,
          order: 4,
          icon: '📈',
          features: ['Custom Reports', 'Dashboards', 'Export Data', 'Advanced Analytics']
        }
      ]
    },
    {
      name: 'Project Management',
      slug: 'pm',
      description: 'Powerful project and task management',
      category: 'Productivity',
      basePrice: 39.00,
      icon: '📊',
      color: 'purple',
      order: 2,
      isActive: true,
      features: [
        'Project Tracking',
        'Task Management',
        'Team Collaboration',
        'Time Tracking',
        'Gantt Charts'
      ],
      modules: [
        {
          name: 'Core Features',
          slug: 'pm-core',
          description: 'Essential project management features',
          pricePerUser: 12.00,
          isCore: true,
          order: 1,
          icon: '⚙️',
          features: ['Project Creation', 'Team Management', 'Basic Views', 'File Storage']
        },
        {
          name: 'Tasks',
          slug: 'pm-tasks',
          description: 'Advanced task management and tracking',
          pricePerUser: 8.00,
          isCore: true,
          order: 2,
          icon: '✓',
          features: ['Task Creation', 'Subtasks', 'Task Dependencies', 'Task Templates']
        },
        {
          name: 'Reports & Analytics',
          slug: 'pm-reports',
          description: 'Project reports and insights',
          pricePerUser: 6.00,
          isCore: false,
          order: 3,
          icon: '📈',
          features: ['Progress Reports', 'Time Reports', 'Resource Allocation', 'Custom Reports']
        }
      ]
    },
    {
      name: 'Accounts',
      slug: 'accounts',
      description: 'Account and subscription management',
      category: 'Administration',
      basePrice: 29.00,
      icon: '💳',
      color: 'orange',
      order: 3,
      isActive: true,
      features: [
        'User Management',
        'Billing & Invoices',
        'Subscriptions',
        'Audit Logs',
        'Roles & Permissions'
      ],
      modules: [
        {
          name: 'Core Features',
          slug: 'accounts-core',
          description: 'Essential account management',
          pricePerUser: 5.00,
          isCore: true,
          order: 1,
          icon: '⚙️',
          features: ['User Profiles', 'Organization Settings', 'Basic Security']
        },
        {
          name: 'Billing & Invoices',
          slug: 'accounts-billing',
          description: 'Manage billing and invoices',
          pricePerUser: 8.00,
          isCore: true,
          order: 2,
          icon: '💰',
          features: ['Invoice Generation', 'Payment History', 'Payment Methods', 'Tax Management']
        }
      ]
    }
  ]
};

async function seed() {
  console.log('🌱 Starting seed process...');

  try {
    for (const appData of seedData.apps) {
      console.log(`\n📦 Seeding app: ${appData.name}`);

      const modules = appData.modules;
      delete appData.modules;

      // Check if app already exists
      const existingApp = await strapi.entityService.findMany('api::app.app', {
        filters: { slug: appData.slug },
        limit: 1
      });

      let app;
      if (existingApp && existingApp.length > 0) {
        console.log(`   ℹ️  App ${appData.name} already exists, updating...`);
        app = await strapi.entityService.update('api::app.app', existingApp[0].id, {
          data: appData
        });
      } else {
        console.log(`   ✨ Creating app ${appData.name}...`);
        app = await strapi.entityService.create('api::app.app', {
          data: {
            ...appData,
            publishedAt: new Date()
          }
        });
      }

      // Seed modules for this app
      for (const moduleData of modules) {
        console.log(`   📋 Seeding module: ${moduleData.name}`);

        const existingModule = await strapi.entityService.findMany('api::module.module', {
          filters: { slug: moduleData.slug },
          limit: 1
        });

        if (existingModule && existingModule.length > 0) {
          console.log(`      ℹ️  Module ${moduleData.name} already exists, updating...`);
          await strapi.entityService.update('api::module.module', existingModule[0].id, {
            data: {
              ...moduleData,
              app: app.id
            }
          });
        } else {
          console.log(`      ✨ Creating module ${moduleData.name}...`);
          await strapi.entityService.create('api::module.module', {
            data: {
              ...moduleData,
              app: app.id,
              publishedAt: new Date()
            }
          });
        }
      }
    }

    console.log('\n✅ Seed process completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Apps created/updated: ${seedData.apps.length}`);
    console.log(`   - Total modules: ${seedData.apps.reduce((sum, app) => sum + app.modules.length, 0)}`);

  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  }
}

module.exports = { seed, seedData };
