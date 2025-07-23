// import session from 'express-session';

// const FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';

// const sessionMiddleware = session({
//   secret: 'mon secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: FRONT_URL !== 'http://localhost:3000',
//     httpOnly: true,
//     sameSite: FRONT_URL === 'http://localhost:3000' ? 'lax' : 'none',
//     path: '/',
//     maxAge: 3600000,
//   }
// });

// export default sessionMiddleware;

// sessionConfig.js
import session from 'express-session';
import { createClient } from 'redis'; // Importez createClient de la bibliothèque 'redis'
import {RedisStore} from "connect-redis";

const FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';
const REDIS_URL = process.env.REDIS_URL;// || 'redis://localhost:6379';

console.log('REDIS_URL:', REDIS_URL); // Pour déboguer l'URL Redis

// 1. Créez un client Redis
const redisClient = createClient({
  url: REDIS_URL, // Utilisez l'URL de votre serveur Redis
  legacyMode: true, // IMPORTANT: Ajoutez ceci pour la compatibilité avec connect-redis v7 et redis v4+
});
// Si l'URL Redis commence par 'rediss://', activez TLS
if (REDIS_URL && REDIS_URL.startsWith('rediss://')) {
  redisClient.socket = {
    tls: true,
  };
}

// Gérer les événements de connexion et d'erreur de Redis (pour le débogage)
redisClient.on('connect', () => console.log('Connecté à Redis!'));
redisClient.on('error', (err) => console.error('Erreur de connexion Redis:', err));

// Connectez le client Redis. C'est important qu'il soit connecté avant d'être utilisé.
// Pour les versions récentes de 'redis', vous devez appeler .connect() explicitement.
redisClient.connect().catch(console.error);


// 2. Configurez le middleware de session avec RedisStore
const sessionMiddleware = session({
  // Utilisez process.env.SESSION_SECRET et NE PAS mettre de secret en dur!
  // Générez une chaîne longue et aléatoire pour la production.
  secret: process.env.SESSION_SECRET || 'super_secret_dev_key', // À REMPLACER ABSOLUMENT EN PROD
  resave: false, // Ne pas sauvegarder la session si elle n'a pas été modifiée
  saveUninitialized: false, // Ne pas sauvegarder les sessions non initialisées (nouvelles et vides)
  store: new RedisStore({ client: redisClient }), // <-- C'EST LA MODIFICATION CLÉ !
  cookie: {
    secure: FRONT_URL !== 'http://localhost:3000', // true en production (nécessite HTTPS)
    httpOnly: true, // Empêche l'accès au cookie via JavaScript côté client
    sameSite: FRONT_URL === 'http://localhost:3000' ? 'lax' : 'none', // 'none' pour CORS, nécessite 'secure: true'
    path: '/',
    maxAge: 3600000, // 1 heure en millisecondes (ajustez selon vos besoins)
  }
});

export default sessionMiddleware;