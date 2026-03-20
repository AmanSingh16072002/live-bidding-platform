import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function register(email, password, role) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3) RETURNING id, email, role`,
    [email, hash, role]
  );
  return rows[0];
}

export async function login(email, password) {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE email=$1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role }
  };
}