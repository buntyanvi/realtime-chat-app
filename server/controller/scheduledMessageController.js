const ScheduledMessageModel = require("../models/ScheduledMessageModel");
const {
  MessageModel,
  ConversationModel,
} = require("../models/ConversationModel");
const UserModel = require("../models/UserModel");

const scheduleMessage = async (req, res) => {
  try {
    const { receiverId, message, scheduleTime } = req.body;
    const senderId = req.user._id; // Assuming you have user info in req.user from auth middleware

    // Validate inputs
    if (!receiverId || !message || !scheduleTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Check if receiver exists
    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // Create scheduled message
    const scheduledMessage = await ScheduledMessageModel.create({
      sender: senderId,
      receiver: receiverId,
      message,
      scheduleTime: new Date(scheduleTime),
    });

    return res.status(201).json({
      success: true,
      message: "Message scheduled successfully",
      data: scheduledMessage,
    });
  } catch (error) {
    console.error("Schedule message error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getScheduledMessages = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have user info in req.user from auth middleware

    const messages = await ScheduledMessageModel.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name profile_pic")
      .populate("receiver", "name profile_pic")
      .sort({ scheduleTime: 1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get scheduled messages error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Function to send scheduled message
const sendScheduledMessage = async (scheduledMessage) => {
  try {
    // Create new message
    const newMessage = await MessageModel.create({
      text: scheduledMessage.message,
      msgByUserId: scheduledMessage.sender,
    });

    // Find or create conversation
    let conversation = await ConversationModel.findOne({
      $or: [
        {
          sender: scheduledMessage.sender,
          receiver: scheduledMessage.receiver,
        },
        {
          sender: scheduledMessage.receiver,
          receiver: scheduledMessage.sender,
        },
      ],
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        sender: scheduledMessage.sender,
        receiver: scheduledMessage.receiver,
        messages: [newMessage._id],
      });
    } else {
      conversation.messages.push(newMessage._id);
      await conversation.save();
    }

    // Update scheduled message status
    scheduledMessage.status = "sent";
    await scheduledMessage.save();

    // Emit socket event if needed
    // global.io.to(receiverId.toString()).emit('new_message', { /* message data */ })
  } catch (error) {
    console.error("Send scheduled message error:", error);
    scheduledMessage.status = "failed";
    await scheduledMessage.save();
  }
};

// Cron job to check and send scheduled messages
const checkScheduledMessages = async () => {
  try {
    const now = new Date();
    const pendingMessages = await ScheduledMessageModel.find({
      status: "pending",
      scheduleTime: { $lte: now },
    });

    for (const message of pendingMessages) {
      await sendScheduledMessage(message);
    }
  } catch (error) {
    console.error("Check scheduled messages error:", error);
  }
};

// Set up cron job to run every minute
const cron = require("node-cron");
cron.schedule("* * * * *", checkScheduledMessages);

module.exports = {
  scheduleMessage,
  getScheduledMessages,
  checkScheduledMessages,
};
