import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const out='temp/audit/artifacts'; await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile('public/movies.json','utf8'));
const movies=data.movies;
const stats={count:movies.length, withPoster:0, withMat:0, withProv:0, titleTypes:{movie:0,tv:0}};
for (const m of movies){ if(m.p) stats.withPoster++; if(m.mat!==undefined) stats.withMat++; if(m.prov) stats.withProv++; if(m.s) stats.titleTypes.tv++; else stats.titleTypes.movie++; }
await writeFile(path.join(out,'data-stats.json'),JSON.stringify(stats,null,2));
console.log(JSON.stringify(stats,null,2));
