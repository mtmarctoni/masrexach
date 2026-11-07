// Share assertions and mobile Slow 4G settings with the full five-page audit.
const config = require("./.lighthouserc.json");
config.ci.collect.url = [
  "http://localhost/",
  "http://localhost/catalogo/",
  "http://localhost/catalogo/07-albufera/",
];
module.exports = config;
