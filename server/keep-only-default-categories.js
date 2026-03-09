import { sequelize } from './src/config/database.js';
import { Category } from './src/models/index.js';

async function keepOnlyDefaultCategories() {
  try {
    console.log('🧹 Keeping only default categories...');
    
    // Define the default category codes we want to keep
    const defaultCategoryCodes = [
      'food', 'transport', 'shopping', 'entertainment', 'bills', 
      'health', 'education', 'subscriptions', 'travel', 'other',
      'salary', 'freelance', 'investment', 'gift'
    ];
    
    // Step 1: Get all users who have categories
    const usersWithCategories = await sequelize.query(`
      SELECT DISTINCT userId FROM categories
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`👥 Found ${usersWithCategories.length} users with categories`);
    
    // Step 2: For each user, keep only default categories
    for (const user of usersWithCategories) {
      const userId = user.userId;
      
      // Delete all non-default categories for this user
      const deletedCount = await Category.destroy({
        where: {
          userId: userId,
          code: {
            [sequelize.Op.notIn]: defaultCategoryCodes
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedCount} non-default categories for user ${userId}`);
      }
      
      // Handle duplicates for default categories (keep the oldest)
      const duplicates = await sequelize.query(`
        SELECT code, GROUP_CONCAT(id ORDER BY createdAt) as ids
        FROM categories 
        WHERE userId = :userId AND code IN (:defaultCodes)
        GROUP BY code 
        HAVING COUNT(*) > 1
      `, {
        replacements: { userId, defaultCodes },
        type: sequelize.QueryTypes.SELECT
      });
      
      for (const duplicate of duplicates) {
        const ids = duplicate.ids.split(',');
        const keepId = ids[0]; // Keep the oldest
        const deleteIds = ids.slice(1);
        
        if (deleteIds.length > 0) {
          await Category.destroy({
            where: { id: deleteIds }
          });
          console.log(`🗑️ User ${userId}: Kept ${duplicate.code} (${keepId}), deleted duplicates: ${deleteIds.join(', ')}`);
        }
      }
    }
    
    // Step 3: Delete any categories with null/empty codes
    const nullDeleted = await Category.destroy({
      where: {
        [sequelize.Op.or]: [
          { code: null },
          { code: '' },
          { code: { [sequelize.Op.trim]: '' } }
        ]
      }
    });
    
    if (nullDeleted > 0) {
      console.log(`🗑️ Deleted ${nullDeleted} categories with null/empty codes`);
    }
    
    // Step 4: Show final state
    const finalCategories = await Category.findAll({
      attributes: ['userId', 'code', 'name', 'createdAt'],
      order: [['userId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log('\n📊 Final categories in database:');
    const userGroups = {};
    finalCategories.forEach(cat => {
      if (!userGroups[cat.userId]) {
        userGroups[cat.userId] = [];
      }
      userGroups[cat.userId].push(cat);
    });
    
    Object.keys(userGroups).forEach(userId => {
      console.log(`\n👤 User ${userId}:`);
      userGroups[userId].forEach(cat => {
        console.log(`  ✅ ${cat.code}: ${cat.name}`);
      });
    });
    
    console.log(`\n🎉 Cleanup completed! Total categories: ${finalCategories.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

keepOnlyDefaultCategories();
