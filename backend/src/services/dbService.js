const Message = require('../models/Message');

async function createMessage(data) {
  const msg = new Message(data);
  return await msg.save();
}

async function getMessages() {
  return await Message.find().sort({ createdAt: -1 });
}

async function getMessageById(id) {
  return await Message.findById(id);
}

async function updateMessage(id, update) {
  return await Message.findByIdAndUpdate(id, update, { new: true });
}

async function getUnsynced() {
  return await Message.find({ syncedToSheet: false, status: 'replied' });
}

async function getTodayStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const pending = await Message.countDocuments({ status: 'pending', createdAt: { $gte: startOfDay } });
  const replied = await Message.countDocuments({ status: 'replied', repliedAt: { $gte: startOfDay } });

  return { pending, replied };
}

module.exports = { createMessage, getMessages, getMessageById, updateMessage, getUnsynced, getTodayStats };
