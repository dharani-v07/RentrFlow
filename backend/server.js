require('dotenv').config();

const http = require('http');
const path = require('path');

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const { createSocketServer } = require('./sockets');

const { initWorkflowNotifications } = require('./workflow/workflowNotifications');

const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const contractorRoutes = require('./routes/contractorRoutes');
const toolsRoutes = require('./routes/toolsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const userRoutes = require('./routes/userRoutes');

async function start() {
  await connectDb(process.env.MONGODB_URI);

  const app = express();

  const clientOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : null;

  app.use(helmet());
  app.use(
    cors({
      origin: clientOrigins || '*',
      credentials: Boolean(clientOrigins),
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    })
  );

  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadDir));

  app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

  initWorkflowNotifications();

  app.use('/api/auth', authRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/contractor', contractorRoutes);
  app.use('/api/tools', toolsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', workflowRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  createSocketServer(server);

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Backend listening on :${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
