import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { scanRouter } from './routes/scan.mjs';
import { healthRouter } from './routes/health.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRouter);
app.use('/api', scanRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Garak API Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Scan endpoint: http://localhost:${PORT}/api/scan`);
});
