// Run after editing a migration; never execute the generated master on an existing database.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const base=fs.readFileSync(path.join(root,'tests/fixtures/schema-before-accounting.sql'),'utf8');
const names=fs.readdirSync(path.join(root,'migrations')).filter(n=>/^202609(08|09)_/.test(n)).sort();
const output=base+'\n'+names.map(n=>'\n-- BEGIN '+n+'\n'+fs.readFileSync(path.join(root,'migrations',n),'utf8')+'\n-- END '+n+'\n').join('');
fs.writeFileSync(path.join(root,'CSAT_master_schema.sql'),output);
const upgrade='-- Existing database upgrade 05–10. Review preflight and backup before execution.\nBEGIN;\nSET LOCAL lock_timeout=\'10s\';\nSET LOCAL statement_timeout=\'5min\';\n'+names.map(n=>'\n-- '+n+'\n'+fs.readFileSync(path.join(root,'migrations',n),'utf8').replace(/(^|\n)BEGIN;\s*\n/,()=> '\n').replace(/COMMIT;\s*$/,()=> '')).join('')+'\nCOMMIT;\n';
fs.writeFileSync(path.join(root,'upgrade-accounting.sql'),upgrade);
console.log('Built fresh schema and one-transaction upgrade from '+names.length+' migrations.');
