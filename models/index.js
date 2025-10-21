const { DataTypes } = require('sequelize');

// Initialize all models and associations
function initModels(sequelize) {
  const User = require('./user')(sequelize, DataTypes);
  const Driver = require('./driver')(sequelize, DataTypes);
  const Vehicle = require('./vehicle')(sequelize, DataTypes);
  const Trip = require('./trip')(sequelize, DataTypes);
  const Payment = require('./payment')(sequelize, DataTypes);
  const Otp = require('./otp')(sequelize, DataTypes);
  const Notification = require('./notification')(sequelize, DataTypes);
  const Rating = require('./rating')(sequelize, DataTypes);

  // Associations
  // User relations
  User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
  Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Trip, { foreignKey: 'userId', as: 'trips' });
  Trip.belongsTo(User, { foreignKey: 'userId', as: 'rider' });

  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Rating, { foreignKey: 'userId', as: 'ratingsGiven' });
  Rating.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Driver relations
  Driver.hasMany(Trip, { foreignKey: 'driverId', as: 'driverTrips' });
  Trip.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  Driver.hasOne(Vehicle, { foreignKey: 'driverId', as: 'vehicle' });
  Vehicle.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  Driver.hasMany(Rating, { foreignKey: 'driverId', as: 'ratingsReceived' });
  Rating.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  // Trip relations
  Trip.hasOne(Payment, { foreignKey: 'tripId', as: 'payment' });
  Payment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

  Trip.hasMany(Rating, { foreignKey: 'tripId', as: 'ratings' });
  Rating.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

  return {
    User,
    Driver,
    Vehicle,
    Trip,
    Payment,
    Otp,
    Notification,
    Rating,
    sequelize,
  };
}

module.exports = {
  initModels,
};
