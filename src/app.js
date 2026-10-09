import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.set('trust proxy', 1); // Render / Vercel sit behind a proxy (needed for rate limiting)
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (Postman, curl) and the configured frontends.
      if (!origin || env.clientUrls.includes(origin.replace(/\/$/, ''))) return callback(null, true);
      callback(null, false);
    },
  })
);
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'tiny' : 'dev'));

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'SecureNotes API is running', docs: '/api/health' });
});
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
