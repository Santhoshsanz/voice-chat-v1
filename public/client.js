const socket = io();
let peerConnection = new RTCPeerConnection();
let localStream = null;
let isMuted = false;
let myId = null;
let myName = "";

const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");
const userList = document.getElementById("userList");
const startBtn = document.getElementById("start");

let isCallStarted = false;

joinBtn.onclick = () => {
  myName = nameInput.value.trim();
  if (myName) {
    nameModal.style.display = "none";
    socket.emit("set-name", myName);
    isCallStarted = true;
    startBtn.disabled = false;
    M.Modal.getInstance(nameModal).close(); // Close the modal using Materialize JS
  }
};

navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(stream => {
    localStream = stream;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = event => {
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.id = "remoteAudio";
      document.body.appendChild(audio);
    };
  })
  .catch(err => console.error("Error accessing media devices:", err));

peerConnection.onicecandidate = event => {
  if (event.candidate) {
    socket.emit("ice-candidate", { candidate: event.candidate, to: myId });
  }
};

startBtn.onclick = async () => {
  if (!isCallStarted) {
    alert("Please enter your name and click 'Start Call' first.");
    return;
  }
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer });
};

document.getElementById("mute").onclick = () => {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  muteBtn.innerText = isMuted ? "mic_off" : "mic";
};

document.getElementById("end").onclick = () => {
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  if (peerConnection) {
    peerConnection.close();
    peerConnection = new RTCPeerConnection();
  }
  document.getElementById("remoteAudio")?.remove();
  socket.disconnect();
};

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("user-list", (users) => {
  userList.innerHTML = "";
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user.name + (user.id === myId ? " (You)" : "");
    userList.appendChild(li);
  });
});

socket.on("offer", async ({ offer, from }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, to: from });
});

socket.on("answer", async ({ answer }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", ({ candidate }) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("kicked", () => {
  alert("You have been kicked from the chat.");
  window.location.reload();
});
