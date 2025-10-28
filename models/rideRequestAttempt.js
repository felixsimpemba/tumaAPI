module.exports = (sequelize, DataTypes) => {
  const RideRequestAttempt = sequelize.define('RideRequestAttempt', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    rideRequestId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'ride_requests',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    driverId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    outcome: {
      type: DataTypes.ENUM('sent', 'accepted', 'declined', 'timeout', 'offline'),
      allowNull: false,
      defaultValue: 'sent',
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'ride_request_attempts',
    timestamps: true,
    indexes: [
      { fields: ['rideRequestId'], name: 'idx_rra_rr' },
      { fields: ['driverId'], name: 'idx_rra_driver' },
      { fields: ['outcome'], name: 'idx_rra_outcome' },
    ],
  });

  return RideRequestAttempt;
};
