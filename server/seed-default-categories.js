import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function seedDefaultCategoriesForUser(userId) {
  try {
    console.log(`🌱 Seeding default categories for user: ${userId}`);
    
    const defaultCategories = [
      { id: 'food', name: 'Food & Dining', color: '#FF6B6B', icon: '🍔', type: 'expense' },
      { id: 'transport', name: 'Transport', color: '#4CAF50', icon: '🚗', type: 'expense' },
      { id: 'shopping', name: 'Shopping', color: '#9C27B0', icon: '🛒', type: 'expense' },
      { id: 'entertainment', name: 'Entertainment', color: '#FF5722', icon: '🎮', type: 'expense' },
      { id: 'bills', name: 'Bills & Utilities', color: '#FF9800', icon: '📄', type: 'expense' },
      { id: 'health', name: 'Health', color: '#2196F3', icon: '🏥', type: 'expense' },
      { id: 'education', name: 'Education', color: '#3F51B5', icon: '📚', type: 'expense' },
      { id: 'subscriptions', name: 'Subscriptions', color: '#F44336', icon: '🔄', type: 'expense' },
      { id: 'travel', name: 'Travel', color: '#795548', icon: '✈️', type: 'expense' },
      { id: 'other', name: 'Other', color: '#607D8B', icon: '📦', type: 'expense' }
    ];

    // Check if user already has categories
    const existingCategories = await Category.findAll({
      where: { userId }
    });
    
    if (existingCategories.length > 0) {
      console.log(`⚠️ User already has ${existingCategories.length} categories:`);
      existingCategories.forEach(cat => {
        console.log(`  - ${cat.id}: ${cat.name}`);
      });
      return;
    }

    // Create each default category
    for (const category of defaultCategories) {
      try {
        await Category.create({
          ...category,
          userId
        });
        console.log(`✅ Created category: ${category.name} (${category.id})`);
      } catch (error) {
        console.error(`❌ Failed to create category ${category.name}:`, error.message);
      }
    }
    
    console.log('🎉 Default categories seeding completed!');
    
    // Verify created categories
    const finalCategories = await Category.findAll({
      where: { userId },
      attributes: ['id', 'name']
    });
    
    console.log(`📊 Final category count: ${finalCategories.length}`);
    finalCategories.forEach(cat => {
      console.log(`  - ${cat.id}: ${cat.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide user ID as argument:');
  console.error('   node seed-default-categories.js YOUR_USER_ID');
  process.exit(1);
}

seedDefaultCategoriesForUser(userId);
