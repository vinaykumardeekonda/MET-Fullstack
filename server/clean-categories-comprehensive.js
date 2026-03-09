import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function cleanCategoryData() {
  try {
    console.log('🧹 Starting comprehensive category cleanup...');
    
    // Step 1: Find and delete categories with null/empty codes
    const nullCodeCategories = await Category.findAll({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' },
          { code: { [sequelize.Op.trim]: '' } }
        ]
      }
    });
    
    if (nullCodeCategories.length > 0) {
      console.log(`🗑️ Deleting ${nullCodeCategories.length} categories with null/empty codes...`);
      await Category.destroy({
        where: {
          [sequelize.Op.or]: [
            { code: null },
            { code: '' },
            { code: { [sequelize.Op.trim]: '' } }
          ]
        }
      });
    }
    
    // Step 2: Find and delete duplicate (userId, code) combinations
    const duplicates = await sequelize.query(`
      SELECT userId, code, COUNT(*) as count, GROUP_CONCAT(id) as ids, MIN(createdAt) as oldestDate
      FROM categories 
      WHERE code IS NOT NULL AND code != ''
      GROUP BY userId, code 
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${duplicates.length} duplicate (userId, code) groups to clean...`);
    
    for (const duplicate of duplicates) {
      const ids = duplicate.ids.split(',');
      
      // Keep the oldest record, delete the rest
      const keepCategory = await Category.findOne({
        where: {
          userId: duplicate.userId,
          code: duplicate.code,
          createdAt: duplicate.oldestDate
        }
      });
      
      if (keepCategory) {
        const deleteIds = ids.filter(id => id !== keepCategory.id);
        console.log(`🗑️ Keeping category ${keepCategory.id} (${keepCategory.code}), deleting: ${deleteIds.join(', ')}`);
        
        if (deleteIds.length > 0) {
          await Category.destroy({
            where: {
              id: deleteIds
            }
          });
        }
      }
    }
    
    // Step 3: Verify cleanup
    const remainingDuplicates = await sequelize.query(`
      SELECT userId, code, COUNT(*) as count
      FROM categories 
      WHERE code IS NOT NULL AND code != ''
      GROUP BY userId, code 
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });
    
    const remainingNullCodes = await Category.count({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' },
          { code: { [sequelize.Op.trim]: '' } }
        ]
      }
    });
    
    console.log('✅ Cleanup completed!');
    console.log(`📊 Remaining duplicate groups: ${remainingDuplicates.length}`);
    console.log(`📊 Remaining null/empty codes: ${remainingNullCodes}`);
    
    if (remainingDuplicates.length === 0 && remainingNullCodes === 0) {
      console.log('🎉 All category data is now clean!');
    } else {
      console.log('⚠️ Some issues remain - please check the logs above');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

cleanCategoryData();
