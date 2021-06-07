const fs = require('fs');
const path = require('path');
const { version } = require('./package.json');

const file = path.resolve(__dirname, './features.json');
let contents = JSON.parse(fs.readFileSync(file, "utf8"));
fs.writeFileSync(file, JSON.stringify(Object.assign(contents, { version }), null, 2));
