const got = require('got');
const jwkToPem = require('jwk-to-pem');

class PrimoPublicKeyResolver {
  APIHOST = 'https://api-na.hosted.exlibrisgroup.com';

  constructor() {
    this.cache = {};
  }

  getPublicKey(kid, env, callback) {
    console.log('Retrieving public key', kid);
    if (this.cache[kid] != undefined) {
      console.log('Key retrieved from cache');
      return callback(null, this.cache[kid])
    }
    const inst_code = kid.split('-')[1];
    got(`${this.APIHOST}/auth/${inst_code}/jwks.json?env=${env}`).json()
    .then(response => {
      let key = response.keys.find(k=>kid==k.kid);
      if (!key) throw new Error(`Cannot find key for kid ${kid}`);
      console.log('Retrieved public key for', kid);
      key = jwkToPem(key);
      this.cache[kid]=key;
      return callback(null, key);
    })
    .catch(e=>{
      console.error('Error retrieving Primo public key', e.message);
      return callback(e, null);
    })
  }
}

const resolver = new PrimoPublicKeyResolver();
const getKeyFunction = env => (header, callback) => {
  resolver.getPublicKey(header.kid, env, function(err, key) {
    if (err) return callback(err, null);
    callback(null, key);
  });
}

module.exports = { PrimoPublicKeyResolver, getKeyFunction };