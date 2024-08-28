const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

let onlineUsers = new Set();
const userSockets = {};

io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);
  
  socket.on("set_user_id", async (userId) => {
    socket.userId = userId;
    console.log(`User I Chat With: ${socket.userId}`);
    try {
      const UserItalk = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { FirstName: true, LastName: true, imageUrl: true },
      });
      socket.emit("user-detail", {
        username: `${UserItalk.FirstName} ${UserItalk.LastName}`,
        imageUrl: UserItalk.imageUrl,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  });


  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`User Id chat with ${socket.userId} joined room ${roomId}`);
  });

  socket.on("clerkuserId", async (ClerkuserId) => {
    try {
      const me = await prisma.user.findUnique({
        where: { clerkUserId: ClerkuserId },
        select: { id: true, imageUrl: true, FirstName: true, LastName: true, clerkUserId: true },
      });
      socket.myuserid = me.id;
      if(socket.myuserid){
      userSockets[socket.myuserid] = socket.id;
      onlineUsers.add(socket.myuserid);
      io.emit("user_online_status", { userId: socket.myuserid,imageUrl:me.imageUrl,username:me.FirstName+" "+me.LastName,clerkuserId:me.clerkUserId, status: true });
      io.emit("current_online_usersID",Array.from(onlineUsers))
      }
      
    } catch (error) {
      console.error("Error fetching clerk user ID:", error);
    }
  }); 

  socket.on("check_already_online_status", () => {
    const isOnline = onlineUsers.has(socket.userId);
    socket.emit("already_online_status", isOnline);
  });
  socket.on("Give_Me_old_chats",async()=>{
    const messagesFromMeToOther = await prisma.chat.findMany({
      where: { sender: socket.myuserid, receiver: socket.userId },
      orderBy: { sentAt: "asc" },
    });

    const messagesFromOtherToMe = await prisma.chat.findMany({
      where: { sender: socket.userId, receiver: socket.myuserid },
      orderBy: { sentAt: "asc" },
    });

    const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort(
      (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
    );
    socket.emit("Giving_old_chats", allMessages);

  })

  socket.on("Give_Me_allChatted_users", async () => {
      socket.emit("current_online_usersID",Array.from(onlineUsers))

  });
  socket.on("send_msg", async (IMsgData) => {
    console.log(IMsgData, "DATA");
    try {
      const message = await prisma.chat.create({
        data: {
          sender: socket.myuserid,
          receiver: socket.userId,
          message: IMsgData,
        },
      });

      socket.emit("receive_msg", message);
      if (onlineUsers.has(socket.userId)) {
        const receiverSocketId = userSockets[socket.userId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_msg", message);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`disconnected: ${socket.myuserid}`);
    onlineUsers.delete(socket.myuserid);
    delete userSockets[socket.userId];
    io.emit("user_online_status", { userId: socket.myuserid, status: false });
    io.emit("current_online_usersID",Array.from(onlineUsers))
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
