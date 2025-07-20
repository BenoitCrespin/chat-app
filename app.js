import express from 'express';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express et serveur HTTP
const app = express();

// Config Twig
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);

// Fichiers statiques
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Route principale
app.get('/', (req, res) => {
  res.render('index.twig');
});

export default app;