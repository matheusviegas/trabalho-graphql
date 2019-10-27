const { Model, DataTypes } = require("sequelize");
const Sequelize = require("../database");
const User = require("./user");

class RegisteredTime extends Model {
  static associate() {
    User.hasMany(RegisteredTime);
    RegisteredTime.belongsTo(User);
  }
}

RegisteredTime.init(
  {
    time_registered: DataTypes.STRING
  },
  { sequelize: Sequelize, modelName: "RegisteredTime" }
);

RegisteredTime.associate();

module.exports = RegisteredTime;
