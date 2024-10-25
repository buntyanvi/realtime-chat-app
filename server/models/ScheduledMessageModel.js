const mongoose = require("mongoose");

const scheduledMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    receiver: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    message: {
      type: String,
      required: true,
    },
    scheduleTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const ScheduledMessageModel = mongoose.model(
  "ScheduledMessage",
  scheduledMessageSchema
);

module.exports = ScheduledMessageModel;
