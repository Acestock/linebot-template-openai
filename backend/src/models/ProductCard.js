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
  // Colors
  headerBgColor: { type: String, default: '#ffffff' },
  titleColor:    { type: String, default: '#111111' },
  subtitleColor: { type: String, default: '#888888' },
  buttonColor:   { type: String, default: '#00B900' },
  bodyBgColor:   { type: String, default: '#ffffff' },
  // Typography & layout
  template:          { type: String, default: 'classic' },  // preset name
  titleFontSize:     { type: String, default: 'xl' },       // xs/sm/md/lg/xl/xxl
  subtitleFontSize:  { type: String, default: 'sm' },
  priceNameFontSize: { type: String, default: 'sm' },
  priceFontSize:     { type: String, default: 'sm' },
  titleAlign:        { type: String, default: 'center' },   // start/center/end
  subtitleAlign:     { type: String, default: 'center' },
  priceAlign:        { type: String, default: 'start' },    // start=L-R row; center=stacked
  showDivider:       { type: Boolean, default: true },
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProductCard', ProductCardSchema);
