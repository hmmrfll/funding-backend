const jwt = require('jsonwebtoken');

// Используйте тот же secret что и в config
const secret = '9ca07d7f4b46af127e7ece0d3efa25bf150b8f03c02e510f47a49ffdbcce7cc6ebc26b1275dc36e3a4e46cf6779c16cdc3c5af1810a129cc900f6757afb93dc7';

const payload = {
    userId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    languageCode: 'en'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this in Postman:');
console.log(`Authorization: Bearer ${token}`);

// Проверим, что токен валидный
try {
    const decoded = jwt.verify(token, secret);
    console.log('\nDecoded token:', decoded);
} catch (error) {
    console.error('Token validation failed:', error);
}
