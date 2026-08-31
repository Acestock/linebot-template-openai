const mongoose = require('mongoose');

const hourPackageSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  hours:     { type: Number, required: true },
  price:     { type: Number, required: true },
  validDays: { type: Number, required: true },
  isActive:  { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('HourPackage', hourPackageSchema);
