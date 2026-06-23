const url = 'http://localhost:5000/auth/login';
const payload = { email: 'admin@vendorbridge.com', password: 'Password@123' };
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
console.log('STATUS', response.status);
console.log('HEADERS', Object.fromEntries(response.headers.entries()));
try {
  const body = await response.text();
  console.log('BODY', body);
} catch (err) {
  console.error('BODY_ERROR', err);
}
