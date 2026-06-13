#!/usr/bin/env node
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { createServer } from 'node:http';

const port = Number(process.env.HARNESS_AUTH_PORT ?? 9229);
const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID ?? 'local_6fbc20';
const issuer = process.env.HARNESS_AUTH_ISSUER ?? `http://localhost:${port}/${userPoolId}`;
const kid = process.env.HARNESS_AUTH_KID ?? 'walking-dog-harness';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = createPublicKey(publicKey).export({ format: 'jwk' });
const privatePem = createPrivateKey(privateKey).export({ format: 'pem', type: 'pkcs8' });

const jwks = {
  keys: [
    {
      ...publicJwk,
      kid,
      use: 'sig',
      alg: 'RS256',
    },
  ],
};

createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === `/${userPoolId}/.well-known/jwks.json`) {
    json(response, jwks);
    return;
  }

  if (request.method === 'POST' && request.url === '/token') {
    const body = await readJson(request);
    const sub = body.sub ?? randomUUID();
    const token = signJwt({
      sub,
      iss: issuer,
      token_use: 'access',
      client_id: process.env.AWS_COGNITO_CLIENT_ID ?? 'walking-dog-harness',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    });
    json(response, { accessToken: token, sub, issuer, jwksUrl: `${issuer}/.well-known/jwks.json` });
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not found' }));
}).listen(port, () => {
  console.log(`walking-dog harness auth issuer listening at ${issuer}`);
  console.log(`JWKS: ${issuer}/.well-known/jwks.json`);
});

function signJwt(payload) {
  const header = { alg: 'RS256', typ: 'JWT', kid };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privatePem);
  return `${signingInput}.${signature.toString('base64url')}`;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function json(response, value) {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value, null, 2));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
