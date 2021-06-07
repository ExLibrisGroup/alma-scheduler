const camelCase = require('lodash/camelCase');

const { name } = require('../package.json');
exports.componentName = camelCase(name);

exports.environment = {
  schedulerApi: "https://api-eu.exldevnetwork.net/alma-scheduler/patron"
}