const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage
} = require("./utils/messages");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server); // sockets accepts the raw server information
// but sexpress creats server for us. So not to use
// express we created a server using http.

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "../public");

app.use(express.static(publicDir));

// server(emit) --> client (receive) - countUpdated
// client(emit) --> server (receive) - increment

//connection is a predefined ethod for creating the connection
io.on("connection", socket => {
  console.log("New websocket connection");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    // this socket.emit will trigger only when the connection is established
    socket.emit("message", generateMessage("Admin", "Welcome to chat room"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
    //socket.emit -> event specific to client
    //io.emit -> event to every connect client
    //socket.broadcast.emit -> event to every client except itself
    //io.to.emit -> send a message to every person in the room only
    //socket.broadcat.to.emit -> specific to a room and send a message to every person except itself
  });

  //this socket.on will trigger only when the user sends a message
  socket.on("sendMessage", (data, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(data)) {
      return callback("Profanity is not allowed..!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, data));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, coords)
      //   `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
    );
    callback();
  });

  //disconnect is predefined socket method for disconnecting the connection.
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log("Server is up on port 3000");
});
