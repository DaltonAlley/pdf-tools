import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
fs.mkdirSync('dist',{recursive:true});
const bootstrap = 'browser/bootstrap.js';
const check = spawnSync(process.execPath,['--check',bootstrap],{stdio:'inherit'});
if (check.status !== 0) process.exit(check.status || 1);
const run = spawnSync('node_modules/.bin/elm',['make','elm/Main.elm','--optimize','--output=dist/elm.js'],{stdio:'inherit'});
if (run.status !== 0) process.exit(run.status || 1);
fs.writeFileSync('dist/app.css',fs.readFileSync('node_modules/da-components/styles/da-components.css','utf8')+'\n'+fs.readFileSync('styles.css','utf8'));
const sources = ['dist/elm.js',bootstrap,'bridge.js','dist/app.css','node_modules/da-components/browser/da-components.js'];
const hash = createHash('sha256');
for (const file of sources) hash.update(fs.readFileSync(file));
const version = hash.digest('hex').slice(0,16), dir = `dist/assets/${version}`;
fs.mkdirSync(dir,{recursive:true});
for (const [source,target] of [['dist/elm.js','elm.js'],[bootstrap,'bootstrap.js'],['bridge.js','bridge.js'],['dist/app.css','app.css'],['node_modules/da-components/browser/da-components.js','da-components.js']]) {
 const bytes = fs.readFileSync(source); fs.writeFileSync(`${dir}/${target}`,bytes); fs.writeFileSync(`${dir}/${target}.gz`,gzipSync(bytes,{level:9}));
}
fs.writeFileSync('dist/app.html',fs.readFileSync('assets/elm.html','utf8').replaceAll('__ASSETS__',`assets/${version}`));
fs.writeFileSync('dist/asset-hashes.txt',`${version}\n`);
fs.unlinkSync('dist/elm.js');
fs.unlinkSync('dist/app.css');
console.log(`Built Elm frontend: ${version}`);
