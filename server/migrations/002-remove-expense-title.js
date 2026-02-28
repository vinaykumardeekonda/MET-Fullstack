import { sequelize } from '../src/config/database.js';
import { DataTypes } from 'sequelize';

export async function up() {
  try {
    // Remove the title column from the expenses table
    await sequelize.getQueryInterface().removeColumn('expenses', 'title');
    console.log('✅ Removed title column from expenses table');
  } catch (error) {
    console.error('❌ Failed to remove title column:', error);
  }
}

export async function down() {
  try {
    // Add the title column back (for rollback)
    await sequelize.getQueryInterface().addColumn('expenses', 'title', {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
        notEmpty: true
      }
    });
    console.log('✅ Added title column back to expenses table');
  } catch (error) {
    console.error('❌ Failed to add title column back:', error);
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  up().then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}
