import { Router, Request, Response } from 'express';
import { register, login } from './authService.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    const user = await register(email, password, role);
    res.status(201).json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(401).json({ error: message });
  }
});

export default router;