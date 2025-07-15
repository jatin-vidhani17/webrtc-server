const express = require("express");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://webrtc-client-fawn.vercel.app",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

app.use(bodyParser.json());

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();
const socketToRoomMapping = new Map();

io.on("connection", (socket) => {
    console.log("New Connection Established:", socket.id);

    socket.on("join-room", (data) => {
        const { roomId, emailId } = data;
        console.log(`User ${emailId} joined room ${roomId}`);
        emailToSocketMapping.set(emailId, socket.id);
        socketToEmailMapping.set(socket.id, emailId);
        socketToRoomMapping.set(socket.id, roomId);
        socket.join(roomId);
        socket.emit("joined-room", { roomId });
        socket.broadcast.to(roomId).emit("user-joined", { emailId });
    });

    socket.on("call-user", (data) => {
        const { emailId, offer } = data;
        const fromEmail = socketToEmailMapping.get(socket.id);
        const socketId = emailToSocketMapping.get(emailId);
        console.log(`Call from ${fromEmail} to ${emailId} with offer`);
        if (socketId) {
            socket.to(socketId).emit("incoming-call", { from: fromEmail, offer });
        } else {
            console.warn(`Target user not found: ${emailId}`);
        }
    });

    socket.on("call-accepted", (data) => {
        const { emailId, ans } = data;
        const socketId = emailToSocketMapping.get(emailId);
        console.log(`Call accepted by ${emailId} with answer`);
        if (socketId) {
            socket.to(socketId).emit("call-accepted", { ans });
        } else {
            console.warn(`Target user not found: ${emailId}`);
        }
    });

    socket.on("ice-candidate", (data) => {
        const roomId = socketToRoomMapping.get(socket.id);
        console.log(`ICE candidate from ${socket.id} in room ${roomId}`);
        socket.broadcast.to(roomId).emit("ice-candidate", { candidate: data.candidate });
    });

    socket.on("disconnect", () => {
        const emailId = socketToEmailMapping.get(socket.id);
        const roomId = socketToRoomMapping.get(socket.id);
        if (emailId) {
            console.log(`User ${emailId} disconnected from room ${roomId}`);
            emailToSocketMapping.delete(emailId);
            socketToEmailMapping.delete(socket.id);
            socketToRoomMapping.delete(socket.id);
            socket.broadcast.to(roomId).emit("user-disconnected", { emailId });
        }
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
