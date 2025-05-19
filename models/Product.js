const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: String,
  price: String,
  category: String,
  company: String,
  userId: String,
});

module.exports = mongoose.model("products", ProductSchema);
