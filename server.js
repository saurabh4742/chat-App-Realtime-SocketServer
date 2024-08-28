const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { handleSocketConnection } = require("./socket");

const app = express();
const prisma = new PrismaClient();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

io.on("connection", (socket) => handleSocketConnection(socket, prisma, io));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
