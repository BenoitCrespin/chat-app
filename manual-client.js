// manual-client.js
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken'; // Assurez-vous d'avoir 'jsonwebtoken' installé
import dotenv from 'dotenv'; // Pour charger votre .env

dotenv.config(); // Charge les variables d'environnement

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_cle_secrete_jwt_pour_dev';
const SERVER_URL = 'http://localhost:3001'; // OU 3000 si votre serveur démarre sur 3000

// Ces valeurs DOIVENT correspondre à l'utilisateur 'aaa' dans votre BDD
const TEST_USER_ID = 7; // Remplacez par l'ID réel de 'aaa'
const TEST_USER_PSEUDO = 'aaa';

const authToken = jwt.sign(
    { userId: TEST_USER_ID, pseudo: TEST_USER_PSEUDO },
    JWT_SECRET,
    { expiresIn: '1h' }
);

console.log('--- MANUAL CLIENT ---');
console.log('Client: Génération du token pour:', TEST_USER_PSEUDO);

const clientSocket = new Client(SERVER_URL, {
    auth: { token: authToken },
    transports: ['websocket'], // Force le websocket
});

clientSocket.on('connect', () => {
    console.log('Client: Connected to server!');
    const testMessage = `Ceci est un message manuel de ${Date.now()}`; // Assign value here
    clientSocket.emit('chat message', { message: testMessage });
    console.log(`Client: Emitted 'chat message': "${testMessage}"`);

    // Listen for the broadcasted message
    clientSocket.on('chat message', (data) => {
        console.log(`Client: Received 'chat message' (broadcast):`, data);
        // Compare with the ORIGINAL testMessage
        if (data.message === testMessage && data.pseudo === TEST_USER_PSEUDO) {
            console.log('Client: Message de test reçu avec succès!');
        } else {
            console.log('Client: Received a message, but it was not the expected one or pseudo mismatch.');
            console.log('Expected:', { message: testMessage, pseudo: TEST_USER_PSEUDO });
            console.log('Received:', data);
        }
        clientSocket.disconnect(); // Disconnect after receiving the message
    });
});

clientSocket.on('connect_error', (err) => {
    console.error('Client: Erreur de connexion:', err.message);
    clientSocket.disconnect();
});

clientSocket.on('error message', (err) => {
    console.error('Client: Le serveur a envoyé un message d\'erreur:', err);
    clientSocket.disconnect();
});

clientSocket.on('disconnect', (reason) => {
    console.log('Client: Déconnecté du serveur. Raison:', reason);
});