module.exports = (sequelize, DataTypes) => {
  const RideRequest = sequelize.define('RideRequest', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    riderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    pickup: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON: { address, lat, lng }',
    },
    dropoff: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON: { address, lat, lng }',
    },
    distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Distance in km',
    },
    estimatedFare: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('searching', 'accepted', 'cancelled', 'failed'),
      allowNull: false,
      defaultValue: 'searching',
    },
    acceptedDriverId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'ride_requests',
    timestamps: true,
    indexes: [
      { fields: ['riderId'], name: 'idx_rr_rider' },
      { fields: ['status'], name: 'idx_rr_status' },
      { fields: ['acceptedDriverId'], name: 'idx_rr_accepted' },
    ],
  });

  return RideRequest;
};
