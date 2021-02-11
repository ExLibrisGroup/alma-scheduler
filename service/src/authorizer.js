const jwt = require('jsonwebtoken');
const verifyjwt = require('util').promisify(jwt.verify);
const { getKeyFunction } = require('./primo-publickey-resolver');

const algorithm = process.env.CLOUDAPP_AUTHORIZER_ALGORITHM || 'RS256';
const ignoreExpiration = (process.env.CLOUDAPP_AUTHORIZER_IGNORE_EXPIRATION=='true');
const allowedApps = process.env.CLOUDAPP_AUTHORIZER_ALLOWED_APPS;
const JWT_ISS_PREFIX = 'ExlCloudApp'.toLowerCase();

module.exports.auth = async header => {
  try {
    const publicKey = require('fs').readFileSync(__dirname + '/public-key.pem');
    const verified = await verify(header, publicKey);
    // Verify issuer
    const issuer = (verified.aud || verified.iss).replace(/:!~/, ':').toLowerCase();
    const valueIssuer = allowedApps ? 
      allowedApps.toLowerCase().split(',').map(v=>`${JWT_ISS_PREFIX}:${v}`).includes(issuer) :
      issuer.startsWith(JWT_ISS_PREFIX);
    if (!valueIssuer) {
      throw new Error('Invalid issuer.');
    } 
    return verified;
  } catch (e) {
    console.log('invalid token', e.message);
    return false;
  }
}

module.exports.authPrimo = async (header, apikey) => {
  try {
    const getKey = getKeyFunction(apikey);
    return await verify(header, getKey);
  } catch(e) {
    console.log('invalid token', e.message);
    return false;
  }
}

const verify = async (auth, publicKey) => {
  if (!auth) {
    return false;
  }
  const tokenParts = auth.split(' ');
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
    throw new Error('No token');
  }
  const verified = await verifyjwt(tokenValue, publicKey, {ignoreExpiration, algorithm});
  return verified;
}