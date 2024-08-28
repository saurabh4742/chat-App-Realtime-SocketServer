const { handleSetUserId, handleJoinRoom, handleMyJoining, handleCheckOnlineStatus, handleOldChats, handleAllChattedUsers, handleSendMessage, handleDisconnect } = require('./userHandlers');

let onlineUsers = new Set();
const userSockets = {};

const handleSocketConnection = (socket, prisma, io) => {
  console.log(`user connected ${socket.id}`);

  socket.on("set_user_id", (id) => handleSetUserId(socket,id, prisma));
  socket.on("join_room", (roomId) => handleJoinRoom(socket, roomId));
  socket.on("my_joining", (user) => handleMyJoining(socket, prisma,user,onlineUsers, userSockets, io));
  socket.on("check_already_online_status", () => handleCheckOnlineStatus(socket, onlineUsers));
  socket.on("Give_Me_old_chats", () => handleOldChats(socket, prisma));
  socket.on("Give_Me_allChatted_users", () => handleAllChattedUsers(socket, onlineUsers));
  socket.on("send_msg", (IMsgData) => handleSendMessage(socket, prisma, IMsgData, onlineUsers, userSockets, io));
  socket.on("disconnect", () => handleDisconnect(socket, onlineUsers, userSockets, io));
};

module.exports = { handleSocketConnection };
