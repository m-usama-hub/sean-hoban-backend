const mongoose = require('mongoose');
const toJson = require('@meanie/mongoose-to-json');

const chatSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: true
    },
    to: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    from: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: Object,
      required: true
    },
    isReadMessage: {
      type: Number,
      required: false
    },
    isDeliveredMessage: {
      type: Boolean,
      required: false
    }
  },
  {
    timestamps: true
  }
);

chatSchema.plugin(toJson);
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
