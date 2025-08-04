import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GarakService } from '../services/garakService.mjs';
import { validateScanRequest } from '../middleware/validation.mjs';

const router = express.Router();
const garakService = new GarakService();

router.post('/scan', validateScanRequest, async (req, res, next) => {
  const scanId = uuidv4();
  
  try {
    console.log(`Starting scan ${scanId} for ${req.body.name}`);
    
    // Set a timeout for the scan (5 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Scan timeout after 5 minutes')), 5 * 60 * 1000);
    });
    
    const result = await Promise.race([
      garakService.runScan(scanId, req.body),
      timeoutPromise
    ]);
    
    res.json({
      success: true,
      scan_id: scanId,
      name: req.body.name,
      status: 'completed',
      timestamp: new Date().toISOString(),
      report: result
    });
    
  } catch (error) {
    console.error(`Scan ${scanId} failed:`, error);
    
    res.status(500).json({
      success: false,
      scan_id: scanId,
      name: req.body.name,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      report: null
    });
  }
});

export { router as scanRouter };
