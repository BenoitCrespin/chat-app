import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express et serveur HTTP
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Config Twig
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);

// Fichiers statiques
app.use(express.static(join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.render('index.twig');
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
