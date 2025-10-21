module.exports = (sequelize, DataTypes) => {
  const Trip = sequelize.define('Trip', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    driverId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    pickup: {
      type: DataTypes.JSON, // { address, lat, lng }
      allowNull: false,
    },
    dropoff: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    distance: {
      type: DataTypes.DECIMAL(10, 2), // kilometers
      allowNull: true,
    },
    fare: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('requested', 'accepted', 'in-progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'requested',
    },
  }, {
    tableName: 'trips',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['driverId'] },
      { fields: ['status'] },
    ],
  });

  return Trip;
};
