import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  const list = http.get(`${BASE_URL}/api/products`);
  check(list, { 'list is 200': (r) => r.status === 200 });

  const products = list.json();
  if (Array.isArray(products) && products.length > 0) {
    const pick = products[Math.floor(Math.random() * products.length)];
    const detail = http.get(`${BASE_URL}/api/products/${pick.id}`);
    check(detail, { 'detail is 200': (r) => r.status === 200 });
  }

  check(http.get(`${BASE_URL}/api/topics`), { 'topics is 200': (r) => r.status === 200 });
  sleep(1);
}
