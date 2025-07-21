import express from 'express';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import { Server } from 'socket.io';

const prisma = new PrismaClient();

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express et serveur HTTP
const app = express();
const sessionMiddleware = session({
  secret: 'mon secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax', // pour permettre les requêtes POST et navigation depuis le même site
    // sameSite: 'none', // Obligatoire pour Render si front ≠ back
    secure: process.env.NODE_ENV === 'production', // false en test
    // httpOnly: true, // pour éviter les accès JavaScript
  }
});
app.use(sessionMiddleware);


// Config Twig
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);

// Fichiers statiques
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route principale
// app.get('/', (req, res) => {
//   res.render('index.twig');
// });
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.render('index'); // index.twig : formulaire de connexion visible
  } else {
    return res.render('index', {
      pseudo: req.session.pseudo,
      connected: true
    });
  }
});

app.post('/login', async (req, res) => {
  console.log('req.body =', req.body);
  
  const { pseudo, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { pseudo },
    });

    if (!user) {
      return res.status(401).send('Utilisateur non trouvé');
    }

    if (user.password !== password) {
      return res.status(401).send('Mot de passe incorrect');
    }

    if (!user.isActive) {
      return res.status(403).send('Compte non activé');
    }

    // OK : enregistrer la session
    req.session.userId = user.id;
    req.session.pseudo = user.pseudo;
    await req.session.save(); // 👈 assure la persistance
    console.log('Session après login:', req.session);
    return res.redirect('/'); // à adapter selon ta route principale
  } catch (err) {
    console.error('Erreur connexion', err);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/whoami', (req, res) => {
  res.send(`Utilisateur connecté : ${req.session.userId || 'Aucun'}`);
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur destruction session:', err);
      return res.status(500).send('Erreur lors de la déconnexion');
    }
    res.clearCookie('connect.sid'); // Important pour Express-session
    return res.redirect('/'); // Redirige vers la page d'accueil
  });
});

// export default app;
export { app, prisma, sessionMiddleware };
export default app;