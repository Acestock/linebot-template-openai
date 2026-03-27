const mongoose = require('mongoose');

const PriceItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: String, required: true }
}, { _id: false });

const ProductCardSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  subtitle:   { type: String, default: '' },
  imageUrl:   { type: String, default: '' },
  priceItems: { type: [PriceItemSchema], default: [] },
  buttonText: { type: String, default: '' },
  buttonUrl:  { type: String, default: '' },
  isActive:   { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductCard', ProductCardSchema);
