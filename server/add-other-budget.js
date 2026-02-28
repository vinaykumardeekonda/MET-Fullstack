import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

const addOtherBudgetCategory = async (userId) => {
  try {
    console.log('🌱 Adding "Other Budget" category...');
    
    const categoryData = {
      id: 'other_budget',
      name: 'Other Budget',
      color: '#607D8B',
      icon: '📊',
      type: 'expense'
    };

    // Check if category already exists
    const existingCategory = await Category.findOne({
      where: { id: categoryData.id, userId }
    });
    
    if (!existingCategory) {
      // Create the category
      await Category.create({
        ...categoryData,
        userId: userId
      });
      console.log(`✅ Created category: ${categoryData.name} with ID: ${categoryData.id}`);
    } else {
      console.log(`⏭️ Category already exists: ${categoryData.name} with ID: ${categoryData.id}`);
    }
    
    console.log('🎉 "Other Budget" category addition completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding "Other Budget" category:', error);
    process.exit(1);
  }
};

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide user ID as argument:');
  console.error('   node add-other-budget.js YOUR_USER_ID');
  process.exit(1);
}

addOtherBudgetCategory(userId);
