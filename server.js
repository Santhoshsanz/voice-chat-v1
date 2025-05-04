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

  // Set the user's name
  socket.on('set-name', (name) => {
    users[socket.id] = { name };
    io.emit('user-list', getUsers());
  });

  // Handle offer
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', { offer: data.offer, from: socket.id });
  });

  // Handle answer
  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', { answer: data.answer });
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', { candidate: data.candidate });
  });

  // Handle kick-user event
  socket.on('kick-user', (targetId) => {
    // Check if the user trying to kick is "SanZ"
    if (users[socket.id].name === "SanZ") {
      io.to(targetId).emit('kicked');
      io.sockets.sockets.get(targetId)?.disconnect();
      io.emit('user-list', getUsers());  // Update the user list
    } else {
      socket.emit('error', { message: 'You do not have permission to kick users.' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user-list', getUsers());
  });

  // Utility function to get all users
  function getUsers() {
    return Object.entries(users).map(([id, user]) => ({
      id,
      name: user.name
    }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
