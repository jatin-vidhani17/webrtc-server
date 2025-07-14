const express = require('express');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app); // Create an HTTP server
const io = new Server(server, {
    cors: {
        origin: 'https://webrtc-client-fawn.vercel.app', // Explicitly allow the client origin
        methods: ['GET', 'POST'],
        credentials: true // Allow credentials if needed
    }
});

app.use(bodyParser.json());

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on('connection', (socket) => {
    console.log('New Connection Established', socket.id);
    socket.on('join-room', (data) => {
        const { roomId, emailId } = data;
        console.log('User', emailId, 'Joined Room', roomId);
        emailToSocketMapping.set(emailId, socket.id);
        socketToEmailMapping.set(socket.id, emailId);
        socket.join(roomId);
        socket.emit('joined-room', { roomId });
        socket.broadcast.to(roomId).emit('user-joined', { emailId });
    });

    socket.on('call-user', (data) => {
        const { emailId, offer } = data;
        const fromEmail = socketToEmailMapping.get(socket.id);
        const socketId = emailToSocketMapping.get(emailId);
        socket.to(socketId).emit('incoming-call', { from: fromEmail, offer });
    });

    socket.on('ice-candidate', (data) => {
        socket.broadcast.emit('ice-candidate', { candidate: data.candidate });
    });
    
    socket.on('call-accepted', (data) => {
        const { emailId, ans } = data;
        const socketId = emailToSocketMapping.get(emailId);
        socket.to(socketId).emit('call-accepted', { ans });
    });
});

// Use the PORT environment variable provided by Render
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
