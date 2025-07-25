import bcrypt from 'bcrypt';
import { prisma } from '../app.js';
import { sendValidationEmail } from '../services/emailService.js';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken'; // Importer jsonwebtoken

const validateRegistration = [
    body('pseudo')
        .isLength({ min: 3 }).withMessage('Le pseudo doit avoir au moins 3 caractères')
        .matches(/^[a-zA-Z0-9]+$/).withMessage('Le pseudo ne doit contenir que des caractères alphanumériques'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
        .isLength({ min: 3 }).withMessage('Le mot de passe doit avoir au moins 3 caractères')
        // .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre')
        // .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Le mot de passe doit contenir au moins un caractère spécial')
];

const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Erreurs de validation lors de l\'inscription:', errors.array());
        // Renvoie un statut 400 (Bad Request) avec les erreurs de validation
        return res.status(400).json({
            success: false,
            message: "Erreurs de validation.",
            errors: errors.array() // Envoyer les détails des erreurs pour que le front-end puisse les afficher
        });
    }

    const { pseudo, email, password } = req.body;

    try {
        let existingUserByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingUserByEmail) {
            console.log('Tentative d\'inscription : Email déjà utilisé pour', email);
            // Renvoie un statut 409 (Conflict) pour indiquer que la ressource existe déjà
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé."
            });
        }

        let existingUserByPseudo = await prisma.user.findUnique({ where: { pseudo } });
        if (existingUserByPseudo) {
            console.log('Tentative d\'inscription : Pseudo déjà utilisé pour', pseudo);
            // Renvoie un statut 409 (Conflict)
            return res.status(409).json({
                success: false,
                message: "Ce pseudo est déjà utilisé."
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                pseudo,
                email,
                password: hashedPassword,
                isActive: false, // Compte non actif tant que l'email n'est pas validé
                token,
                validated: false // Indique que l'email n'a pas été validé
            }
        });

        // Tente d'envoyer l'email de validation après la création de l'utilisateur
        await sendValidationEmail(email, token);
        console.log('Email de validation envoyé à', email);


        console.log('Utilisateur créé avec succès:', user.pseudo);
        // Réponse de succès pour le front-end.
        // Ne pas inclure d'informations sensibles comme le mot de passe hashé ou le token de validation direct.
        return res.status(201).json({ // 201 Created pour une nouvelle ressource
            success: true,
            message: "Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte.",
            user: {
                id: user.id,
                pseudo: user.pseudo,
                email: user.email,
                isActive: user.isActive // Pour informer le front-end de l'état
            }
        });

    } catch (err) {
        console.error("Erreur lors de la création du compte:", err);
        // En cas d'erreur serveur inattendue, renvoyer un statut 500
        return res.status(500).json({ success: false, message: "Une erreur interne du serveur est survenue lors de l'inscription. Veuillez réessayer plus tard." });
    }
};

const login = async (req, res) => {
    const { pseudo, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { pseudo } });

        if (!user) {
            console.log('Utilisateur non trouvé pour', pseudo);
            // Retournez un statut 401 (Unauthorized) et un message d'erreur JSON
            return res.status(401).json({ success: false, message: "Identifiants invalides." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log('Mot de passe incorrect pour', pseudo);
            return res.status(401).json({ success: false, message: "Identifiants invalides." });
        }

        if (!user.isActive) {
            console.log('Compte non activé pour', user.pseudo);
            return res.status(403).json({ success: false, message: "Compte non activé. Veuillez vérifier votre email." });
        }

        // --- NOUVEAU : Génération du JWT ---
        // Le payload du token doit contenir des informations non sensibles mais utiles.
        // N'incluez PAS de mot de passe ou d'informations ultra-sensibles.
        const tokenPayload = {
            userId: user.id,
            pseudo: user.pseudo,
            // Ajoutez d'autres rôles ou permissions si nécessaire
        };

        const JWT_SECRET = process.env.JWT_SECRET;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Le token expire après 1 heure

        // Retournez le token et les informations utilisateur non sensibles au front-end
        console.log('Utilisateur connecté avec succès:', user.pseudo);
        return res.status(200).json({
            success: true,
            message: "Connexion réussie !",
            token: token,
            user: {
                userId: user.id,
                pseudo: user.pseudo,
                // N'envoyez pas le mot de passe !
            }
        });

    } catch (err) {
        console.error('Erreur connexion :', err);
        return res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion." });
    }
};

// Plus besoin car géré côté client
//const logout = (req, res) => {...

const validate = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await prisma.user.findFirst({ where: { token } });

        if (!user) {
            console.log('Validation : Lien invalide ou expiré pour token:', token);
            // Retourne un 400 Bad Request si le token est introuvable
            return res.status(400).json({ success: false, message: "Lien de validation invalide ou expiré." });
        }

        // Si l'utilisateur est déjà actif, on peut le notifier ou juste renvoyer le succès
        if (user.isActive) {
            console.log('Validation : Compte déjà activé pour', user.pseudo);
            return res.status(200).json({ success: true, message: "Votre compte est déjà activé." });
        }

        // Mettre à jour l'utilisateur : activer le compte et supprimer le token de validation
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isActive: true,
                validated: true, // Si vous avez un champ 'validated'
                token: null // Supprime le token de validation de la base de données
            }
        });

        console.log('Compte activé et validé pour:', user.pseudo);

        // On génère un token pour connecter directement l'utilisateur
        const tokenPayload = {
            userId: user.id,
            pseudo: user.pseudo,
        };
        const JWT_SECRET = process.env.JWT_SECRET;
        const authToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token de session valide 1 heure

        // Retourne le JWT et un message de succès
        return res.status(200).json({
            success: true,
            message: "Votre compte a été activé avec succès et vous êtes maintenant connecté !",
            token: authToken, // Le JWT pour la connexion automatique
            user: {
                id: user.id,
                pseudo: user.pseudo,
                email: user.email // Retourne aussi l'email si besoin
            }
        });

    } catch (err) {
        console.error('Erreur lors de la validation du compte :', err);
        // En cas d'erreur serveur, renvoyer un statut 500
        return res.status(500).json({ success: false, message: "Une erreur interne du serveur est survenue lors de la validation." });
    }
};

export { register, login, validate, validateRegistration };
