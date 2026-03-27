const mongoose = require('mongoose');

const PriceItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: String, required: true }
}, { _id: false });

const ProductCardSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  subtitle:      { type: String, default: '' },
  imageUrl:      { type: String, default: '' },
  priceItems:    { type: [PriceItemSchema], default: [] },
  buttonText:    { type: String, default: '' },
  buttonUrl:     { type: String, default: '' },
  // Color customization
  headerBgColor: { type: String, default: '#ffffff' },  // title area background
  titleColor:    { type: String, default: '#111111' },  // title text color
  subtitleColor: { type: String, default: '#888888' },  // subtitle text color
  buttonColor:   { type: String, default: '#00B900' },  // button background color
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductCard', ProductCardSchema);
