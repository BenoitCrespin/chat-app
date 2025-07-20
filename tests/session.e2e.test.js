import { chromium } from 'playwright';
import { httpServer, io } from '../server.js';

let browser, page;

beforeAll(async () => {
    // Lancer le navigateur
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
});

afterAll(async () => {
    await browser.close();
    await new Promise((resolve) => httpServer.close(resolve));
});

describe('Session utilisateur', () => {
    test('Session utilisateur complète : envoi et réception d’un message', async () => {
        // Entrée du pseudo
        await page.waitForSelector('#pseudo-input');
        await page.fill('#pseudo-input', 'Benoit');
        await page.click('#pseudo-submit');

        // Attente du chat
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Envoi d’un message
        await page.fill('#message', 'Bonjour !');
        await page.click('#form button');

        // Attente que le message apparaisse
        await page.waitForSelector('#messages li');

        const messages = await page.$$eval('#messages li', els =>
            els.map(el => el.textContent)
        );
        expect(messages.some(m => m.includes('Bonjour'))).toBe(true);
    });
});
