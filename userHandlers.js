const handleSetUserId = async (socket,id, prisma) => {
    socket.userId = id;
    console.log(`User I Chat With: ${socket.userId}`);
    try {
      const UserItalk = await prisma.user.findUnique({
        where: { id: socket.userId }
      });
      socket.emit("user-detail", {
        name: UserItalk.name,
        image: UserItalk.image,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };
  
  const handleJoinRoom = (socket, roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`User Id chat with ${socket.userId} joined room ${roomId}`);
  };
  
  const handleMyJoining = async (socket, prisma, user, onlineUsers, userSockets, io) => {
    try {
      socket.myuserid = user.id;
      if (socket.myuserid) {
        userSockets[socket.myuserid] = socket.id;
        onlineUsers.add(socket.myuserid);
        io.emit("user_online_status", {
          userId: socket.myuserid,
          image: user.image,
          name: user.name,
          status: true,
        });
        io.emit("current_online_usersID", Array.from(onlineUsers));
      }
    } catch (error) {
      console.error("Error fetching clerk user ID:", error);
    }
  };
  
  const handleCheckOnlineStatus = (socket, onlineUsers) => {
    const isOnline = onlineUsers.has(socket.userId);
    socket.emit("already_online_status", isOnline);
  };
  
  const handleOldChats = async (socket, prisma) => {
    try {
      const messagesFromMeToOther = await prisma.chat.findMany({
        where: { senderId: socket.myuserid, receiver: socket.userId },
        orderBy: { sentAt: "asc" },
      });
  
      const messagesFromOtherToMe = await prisma.chat.findMany({
        where: { senderId: socket.userId, receiver: socket.myuserid },
        orderBy: { sentAt: "asc" },
      });
  
      const allMessages = [...messagesFromMeToOther, ...messagesFromOtherToMe].sort(
        (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
      );
      socket.emit("Giving_old_chats", allMessages);
    } catch (error) {
      console.error("Error fetching old chats:");
    }
  };
  
  const handleAllChattedUsers = (socket, onlineUsers) => {
    socket.emit("current_online_usersID", Array.from(onlineUsers));
  };
  
  const handleSendMessage = async (socket, prisma, IMsgData, onlineUsers, userSockets, io) => {
    try {
      const message = await prisma.chat.create({
        data: {
          senderId: socket.myuserid,
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
  };
  
  const handleDisconnect = (socket, onlineUsers, userSockets, io) => {
    console.log(`disconnected: ${socket.myuserid}`);
    onlineUsers.delete(socket.myuserid);
    delete userSockets[socket.userId];
    io.emit("user_online_status", { userId: socket.myuserid, status: false });
    io.emit("current_online_usersID", Array.from(onlineUsers));
  };
  
  module.exports = {
    handleSetUserId,
    handleJoinRoom,
    handleMyJoining,
    handleCheckOnlineStatus,
    handleOldChats,
    handleAllChattedUsers,
    handleSendMessage,
    handleDisconnect,
  };
  