import { chromium } from 'playwright';
import { httpServer } from '../server.js';

let browser, page;

beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
});

afterAll(async () => {
    await browser.close();
    await new Promise((resolve) => httpServer.close(resolve));
});

describe('Session utilisateur', () => {
    test('Connexion et envoi d’un message', async () => {
        // Connexion via formulaire
        await page.waitForSelector('form#login-form'); // suppose que tu as un id
        await page.fill('input[name="pseudo"]', 'aaa');
        await page.fill('input[name="password"]', 'aaa'); // en clair pour l’instant
        await page.click('form#login-form button[type="submit"]');

        // Attente d’être redirigé sur l’interface du chat
        await page.waitForSelector('#chat-container');

        // Envoi d’un message
        await page.fill('#message', 'Bonjour !');
        await page.click('#form button');

        // Vérifie que le message est bien affiché
        await page.waitForSelector('#messages li');
        const messages = await page.$$eval('#messages li', els =>
            els.map(el => el.textContent)
        );
        expect(messages.some(m => m.includes('Bonjour'))).toBe(true);
    });
});
