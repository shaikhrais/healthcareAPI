const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating SSL certificates for localhost...');

// Generate SSL certificate
const attrs = [
  { name: 'countryName', value: 'US' },
  { name: 'stateOrProvinceName', value: 'Development' },
  { name: 'localityName', value: 'LocalHost' },
  { name: 'organizationName', value: 'HealthCare API' },
  { name: 'organizationalUnitName', value: 'Development' },
  { name: 'commonName', value: 'localhost' }
];

const options = {
  keySize: 2048, // RSA key size
  days: 365,     // Certificate validity period
  algorithm: 'sha256',
  extensions: [
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      keyCertSign: false,
      digitalSignature: true,
      nonRepudiation: false,
      keyEncipherment: true,
      dataEncipherment: false
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS type
          value: 'localhost'
        },
        {
          type: 7, // IP type
          ip: '127.0.0.1'
        },
        {
          type: 7, // IP type
          ip: '::1'
        }
      ]
    }
  ]
};

// Generate the certificate
const pems = selfsigned.generate(attrs, options);

// Ensure ssl directory exists
const sslDir = path.join(__dirname, '.');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

// Write certificate files
fs.writeFileSync(path.join(sslDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(sslDir, 'key.pem'), pems.private);

console.log('✅ SSL certificates generated successfully!');
console.log('📁 Files created:');
console.log('   - cert.pem (certificate)');
console.log('   - key.pem (private key)');
console.log('');
console.log('🔒 Certificate Details:');
console.log('   Subject: CN=localhost');
console.log('   Validity: 365 days');
console.log('   Key Size: 2048 bits');
console.log('   Algorithm: SHA-256');
console.log('');
console.log('⚠️  Note: This is a self-signed certificate for development only.');
console.log('   Browsers will show a security warning that you can safely ignore.');