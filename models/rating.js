module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define('Rating', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tripId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    driverId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'ratings',
    timestamps: true,
    indexes: [
      { fields: ['tripId'] },
      { fields: ['userId'] },
      { fields: ['driverId'] },
    ],
  });

  return Rating;
};
