import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function cleanDuplicateCategories() {
  try {
    console.log('🧹 Starting category cleanup...');
    
    // Get all categories grouped by userId and code
    const duplicates = await sequelize.query(`
      SELECT userId, code, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM categories 
      WHERE code IS NOT NULL AND code != ''
      GROUP BY userId, code 
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${duplicates.length} duplicate groups to clean...`);
    
    // For each duplicate group, keep the first one and delete the rest
    for (const duplicate of duplicates) {
      const ids = duplicate.ids.split(',');
      const keepId = ids[0]; // Keep the first one
      const deleteIds = ids.slice(1); // Delete the rest
      
      console.log(`🗑️ Keeping ${keepId}, deleting: ${deleteIds.join(', ')}`);
      
      await Category.destroy({
        where: {
          id: deleteIds
        }
      });
    }
    
    // Find and delete categories with null/empty codes
    const emptyCodes = await Category.findAll({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' }
        ]
      }
    });
    
    if (emptyCodes.length > 0) {
      console.log(`🗑️ Deleting ${emptyCodes.length} categories with empty/null codes...`);
      await Category.destroy({
        where: {
          [sequelize.Op.or]: [
            { code: null },
            { code: '' }
          ]
        }
      });
    }
    
    console.log('✅ Category cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanDuplicateCategories();
