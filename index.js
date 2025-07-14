const express = require('express');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://webrtc-client-fawn.vercel.app',
        methods: ['GET', 'POST'],
        credentials: true
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
        if (socketId) {
            socket.to(socketId).emit('incomming-call', { from: fromEmail, offer });
        } else {
            console.warn("Target user not found:", emailId);
        }
    });

    socket.on('call-accepted', (data) => {
        const { emailId, ans } = data;
        const socketId = emailToSocketMapping.get(emailId);
        if (socketId) {
            socket.to(socketId).emit('call-accepted', { ans });
        } else {
            console.warn("Target user not found:", emailId);
        }
    });

    socket.on('ice-candidate', (data) => {
        socket.broadcast.emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        const emailId = socketToEmailMapping.get(socket.id);
        if (emailId) {
            emailToSocketMapping.delete(emailId);
            socketToEmailMapping.delete(socket.id);
            console.log('User disconnected:', emailId);
        }
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
