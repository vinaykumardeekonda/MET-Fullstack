import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function migrateCategories() {
  try {
    console.log('🔄 Starting category migration...');
    
    // Get all categories that don't have categoryId populated
    const categories = await Category.findAll({
      where: {
        categoryId: null
      }
    });
    
    console.log(`Found ${categories.length} categories to migrate...`);
    
    // Update each category to use its id as categoryId for backward compatibility
    for (const category of categories) {
      await category.update({
        categoryId: category.id // Use the existing id as categoryId
      });
      console.log(`✅ Migrated category: ${category.name} (id: ${category.id} -> categoryId: ${category.categoryId})`);
    }
    
    console.log('🎉 Category migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateCategories();
