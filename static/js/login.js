// handling login form
let form = document.getElementById("form");
let handleSubmit = async (e) => {
  e.preventDefault();
  let room = document.getElementById("room").value;
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  let response = await fetch(`/get_token/?channel=${room}`);
  let data = await response.json();
  let UID = data.uid;
  let token = data.token;

  sessionStorage.setItem("UID", UID);
  sessionStorage.setItem("token", token);

  const user_data = {
    username: username,
    password: password,
    room: room,
  };
  const options = {
    headers: {
      "X-CSRFToken": getCookie('csrftoken'),
    },
  };
  axios
    .post(`/room_auth/`, user_data, options)
    .then((res) => {
      console.log("res: ", res);
      window.location.href = `/editor/${room}`;
    })
    .catch((err) => {
      console.log("err: ", err["response"]["data"]["msg"]);
      let msg = err["response"]["data"]["msg"];
      let ele = document.getElementById("err");
      ele.classList.add("text-danger");
      ele.innerHTML = msg;
    });
};
form.addEventListener("submit", handleSubmit);

// generate cookie
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie != '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) == (name + '=')) {
            console.log("HHHHHHH")
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
          }
      }
  }
  return cookieValue;
}

