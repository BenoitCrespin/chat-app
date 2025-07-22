const socket = io({
  withCredentials: true,
  autoConnect: false,
});

socket.connect();

document.getElementById('message-form').addEventListener('submit', (e) => {
  e.preventDefault(); // Empêche le rechargement de la page
  const input = document.getElementById('message');
  if (input.value.trim()) {
    socket.emit('chat message', {
      message: input.value
    });
    console.log('Message envoyé:', input.value);
    input.value = '';
  }
});

socket.on('chat message', (data) => {
  const messages = document.getElementById('messages');
  const li = document.createElement('li');
  li.textContent = `${data.pseudo} : ${data.message}`;
  messages.appendChild(li);
});

socket.on('chat history', (msgs) => {
  const messages = document.getElementById('messages');
  msgs.forEach(data => {
    const li = document.createElement('li');
    li.textContent = `${data.pseudo} : ${data.content}`;
    messages.appendChild(li);
  });
});
