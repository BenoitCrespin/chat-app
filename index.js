// index.js
import { httpServer } from './server.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});