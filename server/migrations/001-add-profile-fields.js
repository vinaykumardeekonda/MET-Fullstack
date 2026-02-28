import { DataTypes } from 'sequelize';

export const up = async (queryInterface, Sequelize) => {
  try {
    // Add displayName column
    await queryInterface.addColumn('users', 'displayName', {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'User'
    });

    // Add currency column
    await queryInterface.addColumn('users', 'currency', {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    });

    console.log('✅ Migration completed: Added displayName and currency columns to users table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
  try {
    // Remove displayName column
    await queryInterface.removeColumn('users', 'displayName');

    // Remove currency column
    await queryInterface.removeColumn('users', 'currency');

    console.log('✅ Rollback completed: Removed displayName and currency columns from users table');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};
