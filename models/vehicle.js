module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define('Vehicle', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('car', 'bike', 'van', 'other'),
      allowNull: false,
      defaultValue: 'car',
    },
    plateNumber: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
  }, {
    tableName: 'vehicles',
    timestamps: true,
    indexes: [
      { fields: ['driverId'] },
      { fields: ['plateNumber'] },
    ],
  });

  return Vehicle;
};
