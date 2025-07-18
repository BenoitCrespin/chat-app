import express from 'express';
import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const router = express.Router();

const prisma = new PrismaClient();

router.get('/register', (req, res) => {
  res.render('register.twig');
});

router.post('/register', async (req, res) => {
  const { email, password, pseudo } = req.body;

  if (!email || !password || !pseudo) {
    return res.render('register.twig', { error: 'Tous les champs sont obligatoires.' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { pseudo }]
      }
    });

    if (existingUser) {
      return res.render('register.twig', { error: 'Email ou pseudo déjà utilisé.' });
    }

    const hashedPassword = await hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        pseudo,
        password: hashedPassword,
        verified: false // La validation par mail viendra à l'étape suivante
      }
    });

    res.redirect('/login'); // La page /login sera créée à l'étape 4
  } catch (err) {
    console.error(err);
    res.render('register.twig', { error: 'Une erreur est survenue.' });
  }
});

export default router;
