// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_cle_secrete_jwt_pour_dev'; // Doit être la même que dans authController.js

const authenticateToken = (req, res, next) => {
    // Le token est généralement envoyé dans l'en-tête Authorization comme 'Bearer VOTRE_TOKEN'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Prend la partie après 'Bearer '

    if (token == null) {
        // Pas de token fourni
        return res.status(401).json({ success: false, message: "Accès non autorisé : Aucun token fourni." });
    }

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            // Token invalide (expiré, modifié, etc.)
            console.error('Erreur de vérification JWT :', err.message);
            return res.status(403).json({ success: false, message: "Accès refusé : Token invalide ou expiré." });
        }
        // Si le token est valide, attachez le payload de l'utilisateur à l'objet de requête
        // pour qu'il soit accessible par les contrôleurs suivants.
        req.user = userPayload; // Contient userId, pseudo, etc.
        next(); // Passe au prochain middleware ou au contrôleur de route
    });
};

export default authenticateToken;