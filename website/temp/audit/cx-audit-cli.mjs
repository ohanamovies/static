import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const base=process.env.BASE_URL||'http://localhost:5174';
const outDir=path.resolve('temp/audit/artifacts'); await mkdir(outDir,{recursive:true});
const routes=['/discover','/search','/settings','/roadmap'];
const vps=[['mobile',390,844],['desktop',1365,900]];
const results=[];
for (const [name,w,h] of vps) for (const route of routes){
  const png=path.join(outDir,`${name}-${route.replaceAll('/','_')}.png`);
  const args=['--headless=new','--no-sandbox','--disable-gpu',`--window-size=${w},${h}`,`--screenshot=${png}`,`${base}${route}`];
  const r=spawnSync('/usr/bin/chromium',args,{encoding:'utf8',timeout:30000});
  results.push({name,w,h,route,png,status:r.status,stderr:r.stderr?.slice(-1000)});
}
await writeFile(path.join(outDir,'cli-screenshots.json'),JSON.stringify(results,null,2));
console.log('done', outDir);
