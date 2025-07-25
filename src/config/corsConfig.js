import cors from 'cors';

const FRONT_URL = process.env.FRONT_URL;

const corsConfig = cors({
  origin: FRONT_URL,
  credentials: true,
});

export default corsConfig;
