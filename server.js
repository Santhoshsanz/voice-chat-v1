const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('set-name', (name) => {
    users[socket.id] = { name };
    io.emit('user-list', getUsers());
  });

  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', { offer: data.offer, from: socket.id });
  });

  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', { answer: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', { candidate: data.candidate });
  });

  socket.on('kick-user', (targetId) => {
    // Only allow 'SanZ' to kick users
    if (users[socket.id].name === "SanZ") {
      io.to(targetId).emit('kicked');
      io.sockets.sockets.get(targetId)?.disconnect();
      io.emit('user-list', getUsers());
    } else {
      socket.emit('error', { message: 'You do not have permission to kick users.' });
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user-list', getUsers());
  });

  function getUsers() {
    return Object.entries(users).map(([id, user]) => ({
      id,
      name: user.name
    }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
