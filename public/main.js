const socket = io({
  withCredentials: true,
  autoConnect: false,
});

// const pseudoContainer = document.getElementById('pseudo-container');
// const chatContainer = document.getElementById('chat-container');
// const pseudoInput = document.getElementById('pseudo-input');
// const pseudoSubmit = document.getElementById('pseudo-submit');
const messageForm = document.getElementById('form');
const input = document.getElementById('message');
const messages = document.getElementById('messages');
const loginForm = document.getElementById('login-form');
const logoutForm = document.getElementById('logout-form');

// let pseudo = null;

// pseudoSubmit.addEventListener('click', () => {
//   const val = pseudoInput.value.trim();
//   if (val) {
//     pseudo = val;
//     pseudoContainer.style.display = 'none';
//     chatContainer.style.display = 'block';
//     input.focus();
//   }
// });

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit('chat message', {
      message: input.value
    });
    input.value = '';
  }
});

socket.on('chat message', (data) => {
  const li = document.createElement('li');
  li.textContent = `${data.pseudo} : ${data.message}`;
  messages.appendChild(li);
});

socket.on('chat history', (msgs) => {
  msgs.forEach(data => {
    const li = document.createElement('li');
    li.textContent = `${data.pseudo} : ${data.content}`;
    messages.appendChild(li);
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pseudo = document.getElementById('pseudo').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, password }),
  });

  if (res.ok) {
    socket.connect(); // ici on (re)connecte après login
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
});

logoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const response = await fetch('/logout', {
    method: 'POST',
    credentials: 'include' // important pour les cookies
  });
  if (response.ok) {
    window.location.href = '/'; // Retour à la page d'accueil
  } else {
    alert('Erreur lors de la déconnexion.');
  }
});