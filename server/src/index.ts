import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import technicianRoutes from './routes/technicianRoutes';
import userRoutes from './routes/userRoutes';
import bookingRoutes from './routes/bookingRoutes';
import gamificationRoutes from './routes/gamificationRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
// Increase JSON body limit to 5MB for base64 image uploads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/gamification', gamificationRoutes);

app.get('/', (req, res) => {
    res.send('Santiago Tech RD API');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
