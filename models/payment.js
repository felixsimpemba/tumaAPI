module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    method: {
      type: DataTypes.ENUM('mtn_momo', 'airtel_money', 'cash', 'card', 'other'),
      allowNull: false,
      defaultValue: 'cash',
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    providerRef: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
  }, {
    tableName: 'payments',
    timestamps: true,
    indexes: [
      { fields: ['tripId'] },
      { fields: ['status'] },
      { fields: ['method'] },
    ],
  });

  return Payment;
};
