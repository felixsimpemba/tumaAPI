module.exports = (sequelize, DataTypes) => {
  const TripLocation = sequelize.define('TripLocation', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    tripId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'trips',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    actor: {
      type: DataTypes.ENUM('driver', 'rider'),
      allowNull: false,
      defaultValue: 'driver',
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    speedKph: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    heading: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      comment: 'Degrees 0-359',
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
    tableName: 'trip_locations',
    timestamps: true,
    indexes: [
      { fields: ['tripId'], name: 'idx_tl_trip' },
      { fields: ['createdAt'], name: 'idx_tl_created' },
    ],
  });

  return TripLocation;
};
