const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const requiredEnv = ['MONGO_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');


app.use(express.json({ limit: '10mb' }));

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(generalLimiter);

app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const musicRoutes = require('./routes/musicRoutes');
app.use('/api/music', musicRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const songsRoutes = require('./routes/songsRoutes');
app.use('/api/songs', songsRoutes);

const imagesRoutes = require('./routes/imagesRoutes');
app.use('/api/images', imagesRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Pulse API');
});

app.use(notFound);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})


.then(( ) => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running`))
})
.catch( err => {
    console.error('MongoDB connection error: ', err);
});