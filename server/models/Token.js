// server/models/Token.js
const mongoose = require("mongoose");
const CONFIG = require("../config");

const tokenSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  tokens: { type: Number, default: CONFIG.TOKEN.DAILY_LIMIT },
  lastRefreshed: { type: Date, default: () => new Date() },
});

module.exports = mongoose.model("Token", tokenSchema);
