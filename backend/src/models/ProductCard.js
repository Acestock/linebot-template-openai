const mongoose = require('mongoose');

const PriceItemSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  price: { type: String, required: true }
}, { _id: false });

const ProductCardSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  subtitle:      { type: String, default: '' },
  imageUrl:      { type: String, default: '' },
  imageOnly:     { type: Boolean, default: false }, // true：只顯示整張圖片，不裁切、不疊加標題/價格/按鈕
  imageAspectRatio: { type: String, default: '20:13' }, // imageOnly 模式下使用，格式 "寬:高"，前端會依實際圖片自動偵測
  priceItems:    { type: [PriceItemSchema], default: [] },
  buttonText:    { type: String, default: '' },
  buttonUrl:     { type: String, default: '' },
  // 按鈕動作：url=外部連結（預設）；keyword=觸發後台某個關鍵字的回覆（文字或另一組卡片）
  buttonActionType: { type: String, enum: ['url', 'keyword'], default: 'url' },
  buttonKeywordId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Keyword', default: null },
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
