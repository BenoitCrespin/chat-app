// server.js
// Assurez-vous que dotenv/config est appelé au plus tôt dans votre point d'entrée
// C'est maintenant géré dans app.js, donc pas besoin ici.

console.log('Variables d\'environnement chargées:', {
  FRONT_URL: process.env.FRONT_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  MAILTRAP_USER: process.env.MAILTRAP_USER,
  MAILTRAP_PASS: process.env.MAILTRAP_PASS,
});

import { Server } from 'socket.io';
import { createServer } from 'http';
import { app, prisma } from './app.js';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';

// Définissez votre clé secrète JWT (doit correspondre à celle de authController)
const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_cle_secrete_jwt_pour_dev';

const httpServer = createServer(app);
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173'; // Fallback pour dev si non défini

const io = new Server(httpServer, {
  cors: {
    origin: FRONT_URL,
    credentials: true // Gardez si vous utilisez des cookies pour d'autres raisons, sinon pas strictement nécessaire avec JWT
  }
});
app.set('io', io); // Utile pour accéder à l'instance io depuis les contrôleurs Express

// src/server.js

// --- Middleware d'authentification Socket.IO ---
io.use((socket, next) => {
  // ... votre logique existante ...
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  console.log('[SERVER-IO-AUTH] Attempting connection. Token received:', token ? 'YES' : 'NO');
  if (!token) {
    console.log('[SERVER-IO-AUTH] No token provided, refusing connection.');
    return next(new Error('Authentification requise: Aucun token fourni.'));
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error('[SERVER-IO-AUTH] JWT verification FAILED:', err.message);
      return next(new Error(`Authentification requise: Token invalide ou expiré. Détails: ${err.message}`));
    }
    socket.user = userPayload;
    console.log('[SERVER-IO-AUTH] User authenticated with payload:', socket.user);
    next();
  });
});

// --- Gestionnaire de connexion Socket.IO principal et UNIQUE ---
// Notez que la fonction de rappel est directement définie ici.
// --- Gestionnaire de connexion Socket.IO principal et UNIQUE ---
io.on('connection', async (socket) => { // La fonction est toujours 'async' si vous faites des await à l'intérieur
  console.log('Un utilisateur connecté (Socket.IO):', socket.user.pseudo);

  // DÉBUGGAGE: Capture tous les événements reçus par ce socket (gardez-le pour l'instant)
  socket.onAny((eventName, ...args) => {
      console.log(`[SERVER-SOCKET-DEBUG] Event received from ${socket.user.pseudo}: "${eventName}"`, args);
  });

  // --- DÉPLACEZ LA DÉFINITION DE socket.on('chat message') ICI (avant les await) ---
  socket.on('chat message', async (data) => {
      console.log(`[SERVER-SOCKET] *** Entrée dans le gestionnaire 'chat message' de ${socket.user.pseudo} ***`);
      console.log(`[SERVER-SOCKET] Message reçu de ${socket.user.pseudo}:`, data.message);

      try {
          const userId = socket.user.userId;
          const pseudo = socket.user.pseudo;
          const message = data.message;

          if (!message || message.trim() === '') {
              console.log(`[SERVER-SOCKET] Message vide de ${pseudo}.`);
              return socket.emit('error message', { type: 'chat_message', message: 'Le message ne peut pas être vide.' });
          }

          await prisma.message.create({
              data: {
                  pseudo: pseudo,
                  content: message,
              },
          });
          const messageToSend = { pseudo, content: message, timestamp: new Date() };
          console.log(`[SERVER-SOCKET] Message sauvegardé et émis à tous :`, messageToSend);
          io.emit('chat message', messageToSend);
      } catch (err) {
          console.error('[SERVER-SOCKET] Erreur lors de la sauvegarde ou de l\'émission du message :', err);
          socket.emit('error message', { type: 'chat_message', message: 'Impossible d\'envoyer le message.' });
      }
  });

  // DÉFINISSEZ TOUS LES AUTRES ÉCOUTEURS (disconnect, etc.) ICI AUSSI
  socket.on('disconnect', () => {
      console.log('Un utilisateur déconnecté (Socket.IO):', socket.user ? socket.user.pseudo : 'Inconnu');
  });

  // --- MAINTENANT, EFFECTUEZ LES OPÉRATIONS ASYNCHRONES ---
  // Envoyer l'historique du chat à ce client spécifique
  try {
      const lastMessages = await prisma.message.findMany({
          orderBy: { createdAt: 'asc' },
          take: 50,
      });
      socket.emit('chat history', lastMessages);
      console.log(`[SERVER-SOCKET] Sent chat history to ${socket.user.pseudo}`);
  } catch (err) {
      console.error('Erreur récupération historique Socket.IO:', err);
      socket.emit('error message', { type: 'history_load', message: 'Impossible de charger l\'historique des messages.' });
  }
});

// Démarrage
// const PORT = process.env.PORT || 3000;
// httpServer.listen(PORT, () => {
//   console.log(`Serveur Back-end lancé sur http://localhost:${PORT}`);
//   console.log(`Le FRONT_URL configuré pour CORS Socket.IO est: ${FRONT_URL}`);
// });
// --- NOUVEAU : Fonction pour démarrer le serveur ---
const startServer = () => {
  const PORT = process.env.PORT || 3000;
  return new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`Serveur Back-end lancé sur http://localhost:${PORT}`);
      console.log(`Le FRONT_URL configuré pour CORS Socket.IO est: ${FRONT_URL}`);
      resolve();
    });
  });
};

// --- MODIFICATION ICI : Démarrer le serveur uniquement si ce fichier est le point d'entrée principal ---
// Compare le chemin du fichier actuel avec le chemin du fichier principal du processus
const __filename = fileURLToPath(import.meta.url); // Convertit import.meta.url en chemin de fichier
const __dirname = path.dirname(__filename); // Obtient le répertoire parent (utile pour d'autres usages si besoin)

// Compare le chemin absolu du fichier actuel avec le chemin absolu du module principal
if (process.env.NODE_ENV !== 'test' && path.resolve(__filename) === path.resolve(process.argv[1])) 
{
  startServer();
}

export { httpServer, io };