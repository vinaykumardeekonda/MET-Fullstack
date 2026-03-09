import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function checkUserCategories() {
  try {
    const userId = '3d5ce861-cf6e-4ec4-80ec-a8dac0c22c34';
    console.log(`Checking categories for user: ${userId}`);
    
    const categories = await Category.findAll({
      where: { userId },
      attributes: ['id', 'name', 'userId']
    });
    
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`ID: ${cat.id}, Name: ${cat.name}`);
    });
    
    // Check if 'food' category exists
    const foodCategory = categories.find(cat => cat.id === 'food');
    if (!foodCategory) {
      console.log('❌ Category with ID "food" does not exist for this user');
      console.log('Available category IDs:', categories.map(cat => cat.id));
    } else {
      console.log('✅ Category with ID "food" exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserCategories();
