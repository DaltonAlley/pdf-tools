import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
process.chdir(path.dirname(new URL(import.meta.url).pathname));
let timer, building = false, pending = false;
function build() {
 if (building) { pending = true; return; }
 building = true;
 const child = spawn(process.execPath,['build.mjs'],{stdio:'inherit'});
 child.on('exit',() => { building = false; if (pending) { pending = false; build(); } });
}
for (const target of ['elm','browser','styles.css','bridge.js','assets/elm.html','elm.json','build.mjs','node_modules/da-components']) {
 fs.watch(target,{recursive:['elm','browser','node_modules/da-components'].includes(target)},(_event, filename) => {
  if (filename && String(filename).split(path.sep).some(part => ['_build','.git'].includes(part))) return;
  clearTimeout(timer); timer = setTimeout(build,150);
 });
}
