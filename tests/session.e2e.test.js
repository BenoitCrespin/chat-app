// tests/session.e2e.test.js
import { chromium } from 'playwright';
import { jest } from '@jest/globals';
import { httpServer, io } from '../server.js';

let browser, page;

beforeAll(async () => {
  await new Promise((resolve) => {
    httpServer.listen(3000, 'localhost', () => {
      resolve();
    });
  });
  
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
}, 30000);

afterAll(async () => {
  await browser.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
}, 30000);

describe('Session utilisateur', () => {
  test('Session utilisateur complète : envoi et réception d’un message', async () => {
    // Entrée du pseudo
    console.log('Attente pseudo-input');
    await page.waitForSelector('#pseudo-input');
    console.log('Pseudo-input trouvé');
    await page.fill('#pseudo-input', 'Benoit');
    console.log('Pseudo rempli');
    await page.click('#pseudo-submit');

    // Attente du chat
    console.log('Attente chat-container');
    await page.waitForSelector('#chat-container', { state: 'visible' });
    console.log('Chat-container visible');
    // Envoi d’un message
    let randomMessage = Math.random().toString(36).substring(2, 15);
    await page.fill('#message', randomMessage);
    await page.click('#form button');

    // Attente que le message apparaisse
    console.log(`Attente du message ${randomMessage} dans la liste`);
    await page.waitForSelector(`li:has-text("${randomMessage}")`);
    console.log('Message trouvé dans la liste');

    const messages = await page.$$eval('#messages li', (els) =>
      els.map((el) => el.textContent)
    );
    expect(messages.some((m) => m.includes(randomMessage))).toBe(true);
    console.log('Test terminé avec succès');
  }, 30000);
});