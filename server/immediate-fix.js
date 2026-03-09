import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function immediateFix() {
  try {
    console.log('🚨 IMMEDIATE FIX: Removing problematic categories...');
    
    // Step 1: Delete ALL categories with null, empty, or whitespace-only codes
    console.log('🗑️ Step 1: Deleting null/empty code categories...');
    const nullResult = await Category.destroy({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' },
          { code: ' ' },
          { code: '-' },
          sequelize.where(sequelize.fn('TRIM', sequelize.col('code')), '')
        ]
      }
    });
    console.log(`✅ Deleted ${nullResult} categories with null/empty codes`);
    
    // Step 2: Find and fix any remaining duplicates
    console.log('🔍 Step 2: Finding duplicates...');
    const duplicates = await sequelize.query(`
      SELECT userId, code, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM categories 
      WHERE code IS NOT NULL AND code != '' AND code != '-'
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
    
    // Step 3: Show what's left
    const remaining = await Category.findAll({
      attributes: ['id', 'userId', 'code', 'name'],
      order: [['userId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`\n📊 Remaining categories: ${remaining.length}`);
    remaining.forEach(cat => {
      console.log(`  ✅ ${cat.userId}: ${cat.code} - ${cat.name}`);
    });
    
    console.log('\n🎉 IMMEDIATE FIX COMPLETED!');
    console.log('🚀 Now you can start the server with: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

immediateFix();
