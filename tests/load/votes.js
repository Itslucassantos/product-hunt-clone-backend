import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';
const PRODUCT_ID = __ENV.PRODUCT_ID;

export const options = {
  scenarios: {
    spike: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.post(`${BASE_URL}/api/products/${PRODUCT_ID}/vote`, null, {
    headers: { Authorization: `Bearer dev:load-user-${__VU}` },
  });
  check(res, { 'vote is 200': (r) => r.status === 200 });
}
