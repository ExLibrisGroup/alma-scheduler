const got = require('got');

class PrimoPublicKeyResolver {
  APIHOST = 'https://api-na.hosted.exlibrisgroup.com';

  constructor() {
    this.cache = {};
  }
  getPublicKey(kid, apikey, callback) {
    console.log('Retrieving public key', kid, apikey.slice(-7));
    if (this.cache[kid] != undefined) {
      console.log('Key retrieved from cache');
      return callback(null, this.cache[kid])
    }
    got(`${this.APIHOST}/primo/v1/instPublicKey?apikey=${apikey}`)
    .then(response => {
      const body = response.body;
      console.log('Retrieved public key for', kid);
      this.cache[kid]=body;
      return callback(null, body);
    })
    .catch(e=>{
      console.error('Error retrieving Primo public key', e.message);
      return callback(e, null);
    })
  }
}

const resolver = new PrimoPublicKeyResolver();
const getKeyFunction = apikey => (header, callback) => {
  resolver.getPublicKey(header.kid, apikey, function(err, key) {
    if (err) return callback(err, null);
    callback(null, key);
  });
}

module.exports = { PrimoPublicKeyResolver, getKeyFunction };