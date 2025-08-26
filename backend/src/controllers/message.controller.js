import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const sendMessage = async (req, res) => {
  try {
    // Get the text and image from the request body
    const { text, image } = req.body;
    // Get the ID of the user to send the message to from the URL parameters
    const { id: receiverId } = req.params;
    // Get the ID of the logged-in user
    const senderId = req.user._id;

    let imageUrl;
    // If an image is provided, upload it to Cloudinary
    if (image) {
      // Upload the base64 image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      // Get the secure URL of the uploaded image
      imageUrl = uploadResponse.secure_url;
    }

    // Create a new message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    // Save the message to the database
    await newMessage.save();

    // Send the message to the receiver via socket.io
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // Emit a 'newMessage' event to the receiver's socket
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // Return the new message as JSON
    res.status(201).json(newMessage);
  } catch (error) {
    // Log any errors that occur
    console.log("Error in sendMessage controller: ", error.message);
    // Return a 500 error response
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all users except the logged-in user
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // Get the last message for each conversation
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        return {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          profilePic: user.profilePic,
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            isImage: !!lastMessage.image,
            createdAt: lastMessage.createdAt,
          } : null,
        };
      })
    );

    // Sort users by most recent message
    usersWithLastMessage.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.log("Error in getUsersForSidebar controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
