// Setting the variable at start
const APP_ID = "035a6d6451c745d6b8ea5ac0119bdb49";
const TOKEN = sessionStorage.getItem('token')
let UID = Number(sessionStorage.getItem('UID'));
const currentRoomName = document.getElementById('room-name').innerText

// Creating the call
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTrack;
let remoteUsers = {};

// Call Steam
let joinAndDisplayLocalStream = async () => {
  
  client.on("user-published", handleUserJoined);
  client.on("user-left", handleUserLeft);

  try {
    await client.join(APP_ID, currentRoomName, TOKEN, UID);
  } catch (error) {
    console.error(error)
    window.open('/', '_self')
  }

  localTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish(localTrack);
};

// Join the call
let handleUserJoined = async (user, mediaType) => {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  if(mediaType === 'audio') {
    user.audioTrack.play()
  }
};

// Remove user from call
let handleUserLeft = async(user) => {
  delete remoteUsers[user.uid]
}

// Leave the room and logout
let leaveAndRemoveLocalStream = async() => {
    localTrack.stop()
    localTrack.close()

  await client.leave()

  const user_data = {
    "room": currentRoomName,
  }
  const options = {
    headers: {
      'X-CSRFToken': getCookie("csrftoken"),
    },
  };
  axios
    .post(`/user-logout/`, user_data, options)
    .then((res) => {
      console.log("res: ", res);  
      window.location.href = `/`
    })
    .catch((err) => {
      console.log("err: ", err);
    });
}

// Toggle Mic mute / unmute
let toggleMic= async (e) => {
  if(localTrack.muted) {
    await localTrack.setMuted(false)
    console.log("TARGET: ", e.target)
    e.target.classList.add("btn-info");  
    e.target.innerHTML = "Mute"
  } else {
    await localTrack.setMuted(true)
    // e.target.style.backgroundColor = 'rgba(255, 80, 80, 1)'
    e.target.classList.remove("btn-info");  
    e.target.classList.add("btn-secondary");  
    e.target.innerHTML = "Unmute"
  }
}

joinAndDisplayLocalStream();

document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
