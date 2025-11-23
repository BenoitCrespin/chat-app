// __tests__/socket.test.js
import { io as Client } from 'socket.io-client';
import { httpServer, io as serverIo } from '../src/server.js';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

import { jest } from '@jest/globals';
jest.setTimeout(30000); // Timeout global augmenté

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_cle_secrete_jwt_pour_dev';

let clientSocket;
let existingUser; // Utilisateur existant (pseudo: aaa)
let authToken;

// Démarrage du serveur HTTP et récupération de l'utilisateur de test AVANT tous les tests
beforeAll(async () => {
    // IMPORTANT: Définissez NODE_ENV à 'test' avant d'importer quoi que ce soit qui en dépend
    process.env.NODE_ENV = 'test';

    // 1. Récupérer l'utilisateur existant de la base de données
    // Assurez-vous que cet utilisateur (pseudo: 'aaa') existe et a un mot de passe hashé correct.
    existingUser = await prisma.user.findUnique({ where: { pseudo: 'ccc'} });

    if (!existingUser) {
        // Optionnel: Créez l'utilisateur 'aaa' si vous êtes sûr qu'il n'existe pas déjà
        // Pour les tests, il est préférable de s'assurer qu'il existe AVANT de lancer les tests.
        // Ou, pour cet exemple, on peut choisir de faire échouer les tests si l'utilisateur n'est pas là.
        throw new Error("L'utilisateur 'ccc' n'existe pas dans la base de données de test. Veuillez le créer manuellement.");
        // Alternative : le créer ici si vous le souhaitez, mais la gestion de sa suppression serait alors à nouveau nécessaire.
        // const hashedPassword = await bcrypt.hash('aaa', 10);
        // existingUser = await prisma.user.create({
        //     data: {
        //         pseudo: 'aaa',
        //         email: 'aaa@example.com', // Utilisez un email valide
        //         password: hashedPassword,
        //         isActive: true,
        //         validated: true,
        //     },
        // });
    }

    // 2. Générer un JWT pour cet utilisateur existant
    const tokenPayload = {
        userId: existingUser.id,
        pseudo: existingUser.pseudo,
        password: 'ccc'
    };
    authToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

    // 3. Lancer le serveur HTTP sur un port de test
    await new Promise(resolve => httpServer.listen(3001, () => {
        console.log('[TEST-SETUP] Server is listening on port 3001.'); // <-- ADD THIS
        resolve();
    }));
}, 20000); // Timeout spécifique au hook

// Nettoyage après tous les tests
afterAll(async () => {
    if (clientSocket?.connected) {
        clientSocket.disconnect();
    }
    await new Promise(resolve => httpServer.close(resolve));
    await prisma.$disconnect(); // Déconnecte Prisma
});

describe('Test des sockets avec authentification JWT', () => {
    // Les tests restent les mêmes, mais ils utiliseront `existingUser` et `authToken`
    // au lieu de `testUser` et l'authToken généré pour lui.

    test('Un client peut se connecter avec un JWT valide', (done) => {
        clientSocket = new Client('http://localhost:3001', {
            auth: { token: authToken },
            transports: ['websocket'],
        });

        clientSocket.on('connect', () => {
            expect(clientSocket.connected).toBe(true);
            done();
        });

        clientSocket.on('connect_error', (err) => {
            done(err);
        });
    });

    test('Un client ne peut pas se connecter sans JWT', (done) => {
        const unauthClientSocket = new Client('http://localhost:3001', {
            transports: ['websocket'],
        });

        unauthClientSocket.on('connect', () => {
            unauthClientSocket.disconnect();
            done(new Error('Connexion réussie sans JWT, ce qui est incorrect.'));
        });

        unauthClientSocket.on('connect_error', (err) => {
            expect(err.message).toContain('Authentification requise');
            done();
        });
    });

    test('Le client peut envoyer un message et le recevoir via le broadcast', (done) => {
        const chatClient = new Client('http://localhost:3001', {
            auth: { token: authToken },
            transports: ['websocket'],
        });

        const testMessage = `Ceci est un message de test unique pour ${Date.now()}`; // Pour s'assurer de l'unicité

        chatClient.on('connect', () => {
            console.log('[CLIENT-TEST] Connecté au serveur Socket.IO.'); // <-- AJOUTEZ CE LOG
            chatClient.emit('chat message', { message: testMessage });
            console.log(`[CLIENT-TEST] Émis 'chat message':`, { message: testMessage }); // <-- AJOUTEZ CE LOG
        });

        chatClient.on('chat message', (data) => {
            console.log(`[CLIENT-TEST] Reçu 'chat message':`, data); // <-- AJOUTEZ CE LOG (TRÈS IMPORTANT !)
            // Vérifiez la source du message si vous avez plusieurs clients ou un historique.
            // Le message reçu doit être celui que ce client a envoyé.
            // if (data.message == testMessage && data.pseudo === existingUser.pseudo) {
            if (data.content == testMessage && data.pseudo === existingUser.pseudo) {
                console.log('[CLIENT-TEST] Condition de succès remplie. Appel de done().'); // <-- AJOUTEZ CE LOG
                expect(data.content).toBe(testMessage);
                expect(data.pseudo).toBe(existingUser.pseudo);
                chatClient.disconnect();
                done();
            } else {
                console.log('[CLIENT-TEST] Message reçu, mais ne correspond pas au message attendu ou au pseudo.'); // <-- AJOUTEZ CE LOG
                console.log('Attendu:', { message: testMessage, pseudo: existingUser.pseudo });
                console.log('Reçu:', data);
            }
        });

        chatClient.on('connect_error', (err) => {
            console.error('[CLIENT-TEST] Erreur de connexion:', err.message); // <-- AJOUTEZ CE LOG
            done(err);
        });

        chatClient.on('error message', (err) => {
            console.error('[CLIENT-TEST] Erreur du serveur reçue:', err); // <-- AJOUTEZ CE LOG
            done(new Error(`Erreur du serveur lors de l'envoi du message: ${JSON.stringify(err)}`));
        });
    }, 15000); // Augmentez le timeout à 15 secondes pour laisser le temps aux logs de s'afficher

    test('Le client reçoit l\'historique du chat à la connexion', (done) => {
        const historyClient = new Client('http://localhost:3001', {
            auth: { token: authToken },
            transports: ['websocket'],
        });

        historyClient.on('connect', () => {
            // Le serveur envoie 'chat history' dès la connexion
        });

        historyClient.on('chat history', (history) => {
            expect(Array.isArray(history)).toBe(true);
            historyClient.disconnect();
            done();
        });

        historyClient.on('connect_error', (err) => {
            done(err);
        });
    });
});