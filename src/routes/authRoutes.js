import express from 'express';
import { register, login, validate, validateRegistration } from '../controllers/authController.js';
import authenticateToken from '../middlewares/authMiddleware.js'; // Importez le middleware

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', login);
router.get('/validate/:token', validate);

// Exemple de route protégée (par exemple, pour obtenir le profil de l'utilisateur connecté)
router.get('/me', authenticateToken, (req, res) => {
  // req.user contient maintenant userId, pseudo, etc. grâce au middleware
  res.json({
      success: true,
      user: {
          id: req.user.userId,
          pseudo: req.user.pseudo
      }
  });
});

export default router;
