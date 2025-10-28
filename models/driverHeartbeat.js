module.exports = (sequelize, DataTypes) => {
  const DriverHeartbeat = sequelize.define('DriverHeartbeat', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
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
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('available', 'busy', 'offline'),
      allowNull: false,
      defaultValue: 'offline',
    },
    socketId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'driver_heartbeats',
    timestamps: true,
    indexes: [
      { fields: ['driverId'], name: 'idx_dhb_driver' },
      { fields: ['status'], name: 'idx_dhb_status' },
      { fields: ['lastSeenAt'], name: 'idx_dhb_lastSeen' },
    ],
  });

  return DriverHeartbeat;
};
