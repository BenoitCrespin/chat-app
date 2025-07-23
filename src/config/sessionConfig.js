import session from 'express-session';

const FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';

const sessionMiddleware = session({
  secret: 'mon secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: FRONT_URL !== 'http://localhost:3000',
    httpOnly: true,
    sameSite: FRONT_URL === 'http://localhost:3000' ? 'lax' : 'none',
    path: '/',
    maxAge: 3600000,
  }
});

export default sessionMiddleware;
