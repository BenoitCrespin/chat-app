const socket = io();

const pseudoContainer = document.getElementById('pseudo-container');
const chatContainer = document.getElementById('chat-container');
const pseudoInput = document.getElementById('pseudo-input');
const pseudoSubmit = document.getElementById('pseudo-submit');
const form = document.getElementById('form');
const input = document.getElementById('message');
const messages = document.getElementById('messages');

let pseudo = null;

pseudoSubmit.addEventListener('click', () => {
  const val = pseudoInput.value.trim();
  if (val) {
    pseudo = val;
    pseudoContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    input.focus();
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!pseudo) {
    alert('Veuillez d\'abord entrer un pseudo');
    return;
  }
  if (input.value.trim()) {
    socket.emit('chat message', {
      pseudo,
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