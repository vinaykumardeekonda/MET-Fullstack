import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function debugUserCategories() {
  try {
    // Check all users and their categories
    const categories = await Category.findAll({
      attributes: ['userId', 'id', 'name']
    });
    
    console.log('All categories in database:');
    const userCategories = {};
    
    categories.forEach(cat => {
      if (!userCategories[cat.userId]) {
        userCategories[cat.userId] = [];
      }
      userCategories[cat.userId].push({ id: cat.id, name: cat.name });
    });
    
    Object.keys(userCategories).forEach(userId => {
      console.log(`\nUser ${userId}:`);
      userCategories[userId].forEach(cat => {
        console.log(`  - ${cat.id}: ${cat.name}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugUserCategories();
