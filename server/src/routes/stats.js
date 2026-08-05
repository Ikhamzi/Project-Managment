import { Router } from 'express';
import * as statsService from '../services/statsService.js';

const router = Router();

router.get('/weekly', async (req, res) => {
  try {
    const { week, weeksBack } = req.query;
    const stats = await statsService.getWeeklyStats(req.user.id, {
      week,
      weeksBack: weeksBack !== undefined ? Number(weeksBack) : undefined,
    });
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
