const url = 'http://localhost:5000/auth/login';
const payload = { email: 'admin@vendorbridge.com', password: 'Password@123' };
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
console.log('STATUS', response.status);
const text = await response.text();
console.log('BODY', text);
