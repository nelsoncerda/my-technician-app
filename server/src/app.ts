import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import technicianRoutes from './routes/technicianRoutes';
import userRoutes from './routes/userRoutes';
import bookingRoutes from './routes/bookingRoutes';
import gamificationRoutes from './routes/gamificationRoutes';
import settingsRoutes from './routes/settingsRoutes';
import publicRoutes from './routes/publicRoutes';

export const app = express();
app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

const allowedOrigins = new Set(
    (process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
);

app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header are server-to-server or same-origin.
        if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed'));
    },
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use(publicRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (_req, res) => {
    res.send('Técnicos en RD API');
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled request error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
});

export default app;
