import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
process.chdir(path.dirname(new URL(import.meta.url).pathname));
fs.mkdirSync('dist',{recursive:true});
if (!fs.existsSync('browser/elm-browser/lib/elm_browser.ml')) {
 console.error('Initialize elm-browser first: git submodule update --init --recursive');
 process.exit(1);
}
const browser = spawnSync('dune',['build','--root','browser','--profile','release','bootstrap.bc.js'],{stdio:'inherit'});
if (browser.error) console.error('Building the OCaml bootstrap requires Dune and js_of_ocaml. Enter nix develop .#pdf-app.', browser.error.message);
if (browser.status !== 0) process.exit(browser.status || 1);
const run = spawnSync('node_modules/.bin/elm',['make','elm/Main.elm','--optimize','--output=dist/elm.js'],{stdio:'inherit'});
if (run.status !== 0) process.exit(run.status || 1);
fs.writeFileSync('dist/app.css',fs.readFileSync('node_modules/da-components/styles/da-components.css','utf8')+'\n'+fs.readFileSync('styles.css','utf8'));
const sources = ['dist/elm.js','browser/_build/default/bootstrap.bc.js','bridge.js','dist/app.css','node_modules/da-components/browser/da-components.js'];
const hash = createHash('sha256');
for (const file of sources) hash.update(fs.readFileSync(file));
const version = hash.digest('hex').slice(0,16), dir = `dist/assets/${version}`;
fs.mkdirSync(dir,{recursive:true});
for (const [source,target] of [['dist/elm.js','elm.js'],['browser/_build/default/bootstrap.bc.js','bootstrap.js'],['bridge.js','bridge.js'],['dist/app.css','app.css'],['node_modules/da-components/browser/da-components.js','da-components.js']]) {
 const bytes = fs.readFileSync(source); fs.writeFileSync(`${dir}/${target}`,bytes); fs.writeFileSync(`${dir}/${target}.gz`,gzipSync(bytes,{level:9}));
}
fs.writeFileSync('dist/app.html',fs.readFileSync('assets/elm.html','utf8').replaceAll('__ASSETS__',`assets/${version}`));
fs.writeFileSync('dist/asset-hashes.txt',`${version}\n`);
fs.unlinkSync('dist/elm.js');
fs.unlinkSync('dist/app.css');
console.log(`Built Elm frontend: ${version}`);
