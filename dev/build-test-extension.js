// Copies extension/ to dev/.test-extension/ and lets it also run on http://localhost: the LinkedIn
// mock feed at /, the X mock timeline at /x/. The shipped manifest only matches the real sites.
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'extension');
const OUT = path.join(__dirname, '.test-extension');

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(SRC, OUT, { recursive: true });
  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.name += ' (test build)';
  manifest.host_permissions.push('http://localhost/*', 'http://127.0.0.1/*');
  const LOCAL = ['http://localhost', 'http://127.0.0.1'];
  manifest.content_scripts.forEach((cs) => {
    if (cs.js.includes('src/x/site.js')) {
      cs.matches.push(...LOCAL.map((h) => h + '/x/*'));
    } else if (!cs.js.includes('src/linkedin/site.js')) {
      cs.matches.push(...LOCAL.map((h) => h + '/*')); // shared by both sites (early-keys.js)
    } else {
      cs.matches.push(...LOCAL.map((h) => h + '/*'));
      cs.exclude_matches = LOCAL.map((h) => h + '/x/*');
    }
  });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return OUT;
}

if (require.main === module) console.log('Test extension built at ' + build());

module.exports = { build, OUT };
