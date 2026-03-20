import { Router } from 'express';
import { register, login } from './authService.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await register(email, password, role);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

export default router;