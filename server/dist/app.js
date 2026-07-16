"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const technicianRoutes_1 = __importDefault(require("./routes/technicianRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const gamificationRoutes_1 = __importDefault(require("./routes/gamificationRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
exports.app = (0, express_1.default)();
exports.app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') {
    exports.app.set('trust proxy', 1);
}
exports.app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
const allowedOrigins = new Set((process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean));
exports.app.use((0, cors_1.default)({
    origin(origin, callback) {
        // Requests without an Origin header are server-to-server or same-origin.
        if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin not allowed'));
    },
}));
exports.app.use(express_1.default.json({ limit: '5mb' }));
exports.app.use(express_1.default.urlencoded({ limit: '5mb', extended: true }));
exports.app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
exports.app.use(publicRoutes_1.default);
exports.app.use('/api/auth', authRoutes_1.default);
exports.app.use('/api/technicians', technicianRoutes_1.default);
exports.app.use('/api/users', userRoutes_1.default);
exports.app.use('/api/bookings', bookingRoutes_1.default);
exports.app.use('/api/gamification', gamificationRoutes_1.default);
exports.app.use('/api/settings', settingsRoutes_1.default);
exports.app.get('/', (_req, res) => {
    res.send('Técnicos en RD API');
});
exports.app.use((error, _req, res, _next) => {
    console.error('Unhandled request error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
});
exports.default = exports.app;
