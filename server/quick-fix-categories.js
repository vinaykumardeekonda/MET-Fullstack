import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function quickFix() {
  try {
    console.log('🚨 Quick fix for category duplicates...');
    
    // Step 1: Delete all categories with null/empty codes
    const nullResult = await Category.destroy({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' },
          { code: { [sequelize.Op.trim]: '' } }
        ]
      }
    });
    console.log(`🗑️ Deleted ${nullResult} categories with null/empty codes`);
    
    // Step 2: Get all duplicates and keep only the first one
    const duplicates = await sequelize.query(`
      SELECT userId, code, GROUP_CONCAT(id ORDER BY createdAt) as ids
      FROM categories 
      WHERE code IS NOT NULL AND code != ''
      GROUP BY userId, code 
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`🔍 Found ${duplicates.length} duplicate groups`);
    
    for (const duplicate of duplicates) {
      const ids = duplicate.ids.split(',');
      // Keep the first ID, delete the rest
      const keepId = ids[0];
      const deleteIds = ids.slice(1);
      
      if (deleteIds.length > 0) {
        await Category.destroy({
          where: { id: deleteIds }
        });
        console.log(`🗑️ Kept ${keepId}, deleted: ${deleteIds.join(', ')}`);
      }
    }
    
    console.log('✅ Quick fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Quick fix failed:', error.message);
    process.exit(1);
  }
}

quickFix();
