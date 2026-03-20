import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(
    'http://localhost:4000/auth/login',
    JSON.stringify({ email: 'bidder@test.com', password: 'pass123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('token') };
}

export default function (data) {
  const itemsRes = http.get('http://localhost:4000/items', {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  check(itemsRes, {
    'items status 200': (r) => r.status === 200,
    'items returned': (r) => r.json('items').length > 0,
  });

  sleep(1);
}