module.exports = (sequelize, DataTypes) => {
  const Driver = sequelize.define('Driver', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    vehicleId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    licenseDocUrl: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7), // ~1cm precision
      allowNull: true,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
  }, {
    tableName: 'drivers',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status', 'online'] },
    ],
  });

  return Driver;
};
