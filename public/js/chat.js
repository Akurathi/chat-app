//to call the io function from the client
const socket = io();

const $msgForm = document.querySelector("#message-form");
const $messageFormInput = $msgForm.querySelector("input");
const $messageFormButton = $msgForm.querySelector("button");
const $locationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

//templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const presentLocation = document.querySelector("#preset-location").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;
//options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});

const autoscroll = () => {
  //new message element
  const $newMessage = $messages.lastElementChild;

  //height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  //visible height
  const visibleHeight = $messages.offsetHeight;

  //height of messages container
  const containerHeight = $messages.scrollHeight;

  //how far I scrolled?
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

// server (emit) -> client (receive) --acknowledgement --> server

// client (emit) -> server (receive) --acknowledgement --> client

//for displaying all sockets outputs for each individual client we have this socket
socket.on("message", msg => {
  console.log(msg);
  const html = Mustache.render(messageTemplate, {
    username: msg.username,
    message: msg.text,
    createdAt: moment(msg.createdAt).format("h:mm a")
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", loc => {
  console.log(loc);
  const html = Mustache.render(presentLocation, {
    username: loc.username,
    loc: loc.url,
    createdAt: moment(loc.createdAt).format("h:mm a")
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  });
  document.querySelector("#sidebar").innerHTML = html;
});

$msgForm.addEventListener("submit", event => {
  event.preventDefault();

  $messageFormButton.setAttribute("disabled", "disabled");
  //disable
  const data = event.target.elements.message.value;
  socket.emit("sendMessage", data, error => {
    //enable & clear the data
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("The message was delivered!");
  });
});

$locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported");
  }

  $locationButton.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition(position => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    // console.log(latitude, longitude);
    // const location = "Location :" + latitude + "," + longitude;
    socket.emit("sendLocation", { latitude, longitude }, () => {
      console.log("This location is shared.!");
      $locationButton.removeAttribute("disabled");
    });
  });
});

socket.emit("join", { username, room }, error => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
