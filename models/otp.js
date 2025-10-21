module.exports = (sequelize, DataTypes) => {
  const Otp = sequelize.define('Otp', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.ENUM('login', 'register', 'reset'),
      allowNull: false,
      defaultValue: 'login',
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'otps',
    timestamps: true,
    indexes: [
      { fields: ['phone'] },
      { fields: ['purpose'] },
      { fields: ['expiresAt'] },
    ],
  });

  return Otp;
};
