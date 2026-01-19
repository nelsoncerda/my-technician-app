"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const technicianRoutes_1 = __importDefault(require("./routes/technicianRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const gamificationRoutes_1 = __importDefault(require("./routes/gamificationRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
// Increase JSON body limit to 5MB for base64 image uploads
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ limit: '5mb', extended: true }));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/technicians', technicianRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/gamification', gamificationRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Técnicos en RD API');
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
