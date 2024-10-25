const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cron = require("node-cron");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const UserModel = require("../models/UserModel");
const {
  ConversationModel,
  MessageModel,
} = require("../models/ConversationModel");
const ScheduledMessageModel = require("../models/ScheduledMessageModel");
const getConversation = require("../helpers/getConversation");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

const onlineUser = new Set();

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  try {
    const token = socket.handshake.auth.token;
    const user = await getUserDetailsFromToken(token);

    if (!user) {
      console.error("Invalid token, disconnecting socket:", socket.id);
      return socket.disconnect();
    }

    socket.join(user._id.toString());
    onlineUser.add(user._id.toString());

    io.emit("onlineUser", Array.from(onlineUser));

    socket.on("message-page", async (userId) => {
      try {
        const userDetails = await UserModel.findById(userId).select(
          "-password"
        );
        if (!userDetails) return;

        const payload = {
          _id: userDetails._id,
          name: userDetails.name,
          email: userDetails.email,
          profile_pic: userDetails.profile_pic,
          online: onlineUser.has(userId),
        };

        socket.emit("message-user", payload);

        const conversation = await ConversationModel.findOne({
          $or: [
            { sender: user._id, receiver: userId },
            { sender: userId, receiver: user._id },
          ],
        })
          .populate("messages")
          .sort({ updatedAt: -1 });

        socket.emit("message", conversation?.messages || []);
      } catch (error) {
        console.error("Error fetching message page:", error);
      }
    });

    // Send new message ------------------
    socket.on("new message", async (data) => {
      console.log("new message", data);
      try {
        let conversation = await ConversationModel.findOne({
          $or: [
            { sender: data.sender, receiver: data.receiver },
            { sender: data.receiver, receiver: data.sender },
          ],
        });

        if (!conversation) {
          conversation = await new ConversationModel({
            sender: data.sender,
            receiver: data.receiver,
          }).save();
        }

        const message = new MessageModel({
          text: data.text,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
          msgByUserId: data.msgByUserId,
        });

        const savedMessage = await message.save();
        await ConversationModel.updateOne(
          { _id: conversation._id },
          { $push: { messages: savedMessage._id } }
        );

        const updatedConversation = await ConversationModel.findById(
          conversation._id
        ).populate("messages");
        io.to(data.sender).emit("message", updatedConversation.messages || []);
        io.to(data.receiver).emit(
          "message",
          updatedConversation.messages || []
        );

        io.to(data.sender).emit(
          "conversation",
          await getConversation(data.sender)
        );
        io.to(data.receiver).emit(
          "conversation",
          await getConversation(data.receiver)
        );
      } catch (error) {
        console.error("Error sending new message:", error);
      }
    });

    socket.on("sidebar", async (currentUserId) => {
      try {
        const conversation = await getConversation(currentUserId);
        socket.emit("conversation", conversation || []);
      } catch (error) {
        console.error("Error fetching sidebar:", error);
      }
    });

    socket.on("seen", async (msgByUserId) => {
      try {
        const conversation = await ConversationModel.findOne({
          $or: [
            { sender: user._id, receiver: msgByUserId },
            { sender: msgByUserId, receiver: user._id },
          ],
        });

        if (!conversation) return;

        await MessageModel.updateMany(
          { _id: { $in: conversation.messages }, msgByUserId },
          { $set: { seen: true } }
        );

        io.to(user._id.toString()).emit(
          "conversation",
          await getConversation(user._id)
        );
        io.to(msgByUserId).emit(
          "conversation",
          await getConversation(msgByUserId)
        );
      } catch (error) {
        console.error("Error updating seen status:", error);
      }
    });

    socket.on("get-all-users", async () => {
      try {
        const users = await UserModel.find({})
          .select("name profile_pic")
          .lean();
        socket.emit("all-users", users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    });

    socket.on("schedule-message", async (data) => {
      try {
        const scheduledMessage = new ScheduledMessageModel({
          sender: user._id,
          receiver: data.receiverId,
          message: data.message,
          scheduleTime: new Date(data.scheduleTime),
        });

        await scheduledMessage.save();
        const messages = await ScheduledMessageModel.find({
          sender: user._id,
        }).sort({ scheduleTime: -1 });
        socket.emit("scheduled-messages", messages);
      } catch (error) {
        console.error("Error scheduling message:", error);
      }
    });

    socket.on("get-scheduled-messages", async () => {
      try {
        const messages = await ScheduledMessageModel.find({
          sender: user._id,
        }).sort({ scheduleTime: -1 });
        socket.emit("scheduled-messages", messages);
      } catch (error) {
        console.error("Error fetching scheduled messages:", error);
      }
    });

    socket.on("clear-chat", async ({ sender, receiver }) => {
      try {
        const conversation = await ConversationModel.findOne({
          $or: [
            { sender, receiver },
            { sender: receiver, receiver: sender },
          ],
        });

        if (!conversation) return;

        await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

        await ConversationModel.updateOne(
          { _id: conversation._id },
          { $set: { messages: [] } }
        );

        io.to(sender).emit("deleted", await getConversation(sender));
        io.to(receiver).emit("deleted", await getConversation(receiver));
      } catch (error) {
        console.error("Error clearing chat:", error);
      }
    });

    socket.on("disconnect", () => {
      onlineUser.delete(user._id.toString());
      console.log("User disconnected:", socket.id);
      io.emit("onlineUser", Array.from(onlineUser));
    });
  } catch (error) {
    console.error("Error on connection:", error);
    socket.disconnect();
  }
});

const sendScheduledMessage = async (scheduledMessage, io) => {
  try {
    const message = {
      sender: scheduledMessage.sender,
      receiver: scheduledMessage.receiver,
      text: scheduledMessage.message,
      imageUrl: "",
      videoUrl: "",
      msgByUserId: scheduledMessage.sender,
    };
    console.log("Sending scheduled message from cron job", message);

    io.emit("send message", message);

    // io.to(message.sender.toString()).emit("new message", message);
    // io.to(message.receiver.toString()).emit("new message", message);

    await ScheduledMessageModel.updateOne(
      { _id: scheduledMessage._id },
      { $set: { status: "sent" } }
    );
  } catch (error) {
    console.error("Error sending scheduled message:", error);
    await ScheduledMessageModel.updateOne(
      { _id: scheduledMessage._id },
      { $set: { status: "failed" } }
    );
  }
};
//every 10 seconds
cron.schedule("*/10 * * * * *", async () => {
  try {
    const currentTime = new Date();
    const messages = await ScheduledMessageModel.find({
      scheduleTime: { $lte: currentTime },
      status: "pending",
    });
    console.log("Scheduled messages to send:", messages);

    for (const message of messages) {
      await sendScheduledMessage(message, io); // Ensure io is passed here
    }
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

module.exports = { app, server };
