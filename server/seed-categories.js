import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

const categories = [
  { id: 'food', name: 'Food & Dining', color: '#FF6B6B', icon: '🍔', type: 'expense' },
  { id: 'transport', name: 'Transport', color: '#4CAF50', icon: '🚗', type: 'expense' },
  { id: 'shopping', name: 'Shopping', color: '#9C27B0', icon: '🛒', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', color: '#FF5722', icon: '🎮', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', color: '#FF9800', icon: '📄', type: 'expense' },
  { id: 'health', name: 'Health', color: '#2196F3', icon: '🏥', type: 'expense' },
  { id: 'education', name: 'Education', color: '#3F51B5', icon: '📚', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#FF9800', icon: '🔄', type: 'expense' },
  { id: 'travel', name: 'Travel', color: '#795548', icon: '✈️', type: 'expense' },
  { id: 'other', name: 'Other', color: '#607D8B', icon: '📦', type: 'expense' }
];

const seedCategories = async (userId) => {
  try {
    console.log('🌱 Seeding categories with string IDs...');
    console.log('👤 Using user ID:', userId);
    
    for (const category of categories) {
      // Check if category already exists
      const existingCategory = await Category.findOne({
        where: { id: category.id, userId }
      });
      
      if (!existingCategory) {
        // Create new category with string ID
        await Category.create({
          id: category.id, // Use string ID instead of UUID
          name: category.name,
          color: category.color,
          icon: category.icon,
          type: category.type,
          userId: userId
        });
        console.log(`✅ Created category: ${category.name} with ID: ${category.id}`);
      } else {
        console.log(`⏭️ Category already exists: ${category.name} with ID: ${category.id}`);
      }
    }
    
    console.log('🎉 Categories seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide user ID as argument:');
  console.error('   node seed-categories.js YOUR_USER_ID');
  process.exit(1);
}

seedCategories(userId);
