import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
const dest=path.join(root,'dist');
const planetary=existsSync(path.join(root,'planet-app')) ? path.join(root,'planet-app') : path.join(root,'../frontend');
const compiled=path.join(planetary,'dist');
if(!existsSync(path.join(compiled,'index.html'))) throw Error('Build the planetary React frontend first (npm ci and npm run build).');
mkdirSync(dest,{recursive:true});
cpSync(compiled,dest,{recursive:true});
renameSync(path.join(dest,'index.html'),path.join(dest,'planets.html'));
const routes=['index.html','atlas.css','atlas.js','atlas-icons.js','orion.webp','planner.html','planner.js','windows.json','experiments.html','experiments.js','sky.html','sky.js','sky-data','high.html','high.js','high-data'];
for(const route of routes)cpSync(path.join(root,route),path.join(dest,route),{recursive:true});
for (const file of readdirSync(dest).filter(f=>f.endsWith('.html'))){
 const html=readFileSync(path.join(dest,file),'utf8');
 for(const [,rel] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(/^(?:#|https?:|mailto:|data:)/.test(rel))continue;
  const resource=rel.split(/[?#]/)[0].replace(/^\//,'');
  if(resource && !existsSync(path.resolve(dest,resource)))throw Error(file+' has a missing link: '+rel);
 }
}
console.log('Built all observatory routes in '+dest);
