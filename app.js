import express from 'express';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { hash } from 'crypto';

const prisma = new PrismaClient();

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express et serveur HTTP
const app = express();
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';
const sessionMiddleware = session({
  secret: 'mon secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: FRONT_URL !== 'http://localhost:3000', // false en test
    httpOnly: true, // pour éviter les accès JavaScript
    sameSite: FRONT_URL === 'http://localhost:3000' ? 'lax' : 'none', // pour les tests locaux
    path: '/',
    maxAge: 3600000, // 1 hour
  }
});
app.set('trust proxy', 1);
app.use(sessionMiddleware);

app.use(
  cors({
    origin: FRONT_URL,
    credentials: true, // pour permettre les cookies
  })
);

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
      console.log('Utilisateur non trouvé pour', pseudo);
      return res.status(401).send('Utilisateur non trouvé');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log('Mot de passe incorrect pour', pseudo);
      return res.status(401).send('Mot de passe incorrect');
    }


    if (!user.isActive) {
      console.log('Compte non activé pour', user.pseudo);
      return res.status(403).send('Compte non activé');
    }

    // OK : enregistrer la session
    req.session.userId = user.id;
    req.session.pseudo = user.pseudo;
    await req.session.save(); // 👈 assure la persistance
    console.log('Session après login:', req.session);
    return res.redirect('/');
  } catch (err) {
    console.error('Erreur connexion', err);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/whoami', (req, res) => {
  res.send(`Utilisateur connecté : ${req.session.userId || 'Aucun'}`);
});

app.get('/check-session', (req, res) => {
  res.json({ session: req.session });
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

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/'); // déjà connecté → redirection
  }
  res.render('register.twig');
});

app.post('/register', async (req, res) => {
  const { pseudo, email, password } = req.body;

  if (!pseudo || !email || !password) {
    return res.render('register.twig', { error: "Tous les champs sont requis." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.render('register.twig', { error: "Cet email est déjà utilisé." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        pseudo,
        email,
        password: hashedPassword,
        isActive: false,
      }
    });
    console.log('Utilisateur créé:', user);
    res.render('register.twig', { success: "Compte créé avec succès. Veuillez vous connecter." });
  } catch (err) {
    console.error("Erreur création compte:", err);
    res.render('register.twig', { error: "Erreur serveur. Réessaye plus tard." });
  }
});

// export default app;
export { app, prisma, sessionMiddleware };
export default app;