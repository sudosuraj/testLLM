import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'garak-api-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export { router as healthRouter };
