import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import app from './app.js';

import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const httpServer = createServer(app);
const io = new Server(httpServer);

// Pour les tests, on peut utiliser un écho simple
io.on('connection', (socket) => {
  socket.on('message', (msg) => {
    socket.emit('message', msg); // réponse écho
  });
});

// Socket.IO
io.on('connection', async (socket) => {
  console.log('Un utilisateur connecté');

  // Récupérer les derniers messages (par exemple, les 50 plus récents)
  try {
    const lastMessages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },  // ou 'desc' puis inverser côté client
      take: 50,
    });
    // Envoyer l’historique au client connecté
    socket.emit('chat history', lastMessages);
  } catch (err) {
    console.error('Erreur récupération historique:', err);
  }

  socket.on('chat message', async (data) => {
    try {
      await prisma.message.create({
        data: {
          pseudo: data.pseudo,
          content: data.message,
        },
      });
    } catch (err) {
      console.error('Erreur sauvegarde message:', err);
    }
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur déconnecté');
  });
});



// Démarrage
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

export { httpServer, io };