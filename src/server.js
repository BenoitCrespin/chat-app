import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join } from 'path';
import bodyParser from 'body-parser';
import twig from 'twig';
import authRoutes from './routes/auth.js';
import { createTransport } from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

// __filename = chemin complet du fichier courant
const __filename = fileURLToPath(import.meta.url);

// __dirname = dossier du fichier courant
const __dirname = path.dirname(__filename);


const app = express();
const server = createServer(app);
const io = new Server(server);

// Twig config
app.set('view engine', 'twig');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', join(__dirname, 'views'));
app.engine('twig', twig.renderFile);
app.use('/', authRoutes);

// Fichiers statiques
app.use(express.static(join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.render('index.twig');
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Un utilisateur connecté');
  
    socket.on('chat message', (data) => {
      io.emit('chat message', {
        pseudo: data.pseudo,
        message: data.message
      });
    });
  
    socket.on('disconnect', () => {
      console.log('Un utilisateur déconnecté');
    });
});  

// Lancement du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});

const transporter = createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  async function sendVerificationEmail(user) {
    try {
      await transporter.sendMail({
        from: '"Chat App" <no-reply@chat.com>',
        to: user.email,
        subject: 'Activation de votre compte',
        html: `<a href="http://localhost:3000/verify?token=${user.token}">Cliquez ici pour activer votre compte</a>`
      });
      console.log("Email d'activation envoyé !");
    } catch (err) {
      console.error("Erreur envoi email :", err);
    }
  }
  