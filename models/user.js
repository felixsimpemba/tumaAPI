module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: true,
      validate: { isEmail: true },
    },
    role: {
      type: DataTypes.ENUM('user', 'driver', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    phoneVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // enables soft delete column deletedAt
    indexes: [
      { fields: ['phone'] },
      { fields: ['email'] },
      { fields: ['role'] },
    ],
  });

  return User;
};
