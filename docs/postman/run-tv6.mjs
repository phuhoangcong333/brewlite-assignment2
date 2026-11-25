import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createWriteStream, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const require=createRequire(import.meta.url);
const databaseURL=process.env.E2E_DATABASE_URL;
if (!databaseURL || !/(^|[_-])(tests?|e2e)([_-]|$)/i.test(new URL(databaseURL).pathname.slice(1))) {
  throw new Error('Set E2E_DATABASE_URL to a dedicated migrated test database (name must contain test/tests/e2e).');
}
const {PrismaClient}=require(resolve(root,'apps/api/node_modules/@prisma/client'));
const db=new PrismaClient({datasourceUrl:databaseURL});
const port=Number(process.env.TV6_API_PORT || 3201);
const baseUrl=`http://127.0.0.1:${port}`;
const output=resolve(process.env.TV6_RESULTS_DIR || resolve(here,'tv6-results'));
mkdirSync(output,{recursive:true});
const log=createWriteStream(resolve(output,'api-server.log'));
const users=[];
let product,ingredient,server;
const startedAt=new Date().toISOString();
const runId=randomUUID();
const password='TV6-fixture-'+randomUUID();
const environmentPath=resolve(here,'TV6.local.postman_environment.json');
let environmentWritten=false;
try {
  // Refuse to reuse an unrelated API listening on the fixture port.
  try { await fetch(baseUrl+'/health',{signal:AbortSignal.timeout(1000)}); throw new Error(`Port ${port} is occupied; choose a free TV6_API_PORT.`); }
  catch(error) { if(error.message.includes('occupied')) throw error; }
  server=spawn(process.execPath,['dist/main.js'],{cwd:resolve(root,'apps/api'),windowsHide:true,env:{...process.env,PORT:String(port),DATABASE_URL:databaseURL,JWT_SECRET:randomUUID()},stdio:['ignore','pipe','pipe']});
  server.stdout.pipe(log);server.stderr.pipe(log);
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw new Error('Fixture API exited; inspect api-server.log.');
    try{if((await fetch(baseUrl+'/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  if(!ready)throw new Error('Fixture API did not start.');
  const accounts={};
  for(const role of ['customer','staff','other']){
    const email=`tv6-${role}-${runId}@example.test`;
    const response=await fetch(baseUrl+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(response.status!==201)throw new Error('Fixture registration failed: '+await response.text());
    const data=await response.json();
    users.push(data.user.id);accounts[role]={email,id:data.user.id};
    if(role==='staff')await db.user.update({where:{id:data.user.id},data:{role:'STAFF'}});
  }
  ingredient=await db.ingredient.create({data:{name:`TV6 milk ${runId}`,unit:'ml',stockQuantity:200}});
  product=await db.product.create({data:{name:`TV6 coffee ${runId}`,price:35000,stock:0,recipeItems:{create:[['S',10],['M',15],['L',20]].map(([size,amountRequired])=>({size,amountRequired,ingredientId:ingredient.id}))}}});
  const values={baseUrl,productId:product.id,ingredientId:ingredient.id,customerEmail:accounts.customer.email,staffEmail:accounts.staff.email,otherEmail:accounts.other.email,password,runId};
  if(process.argv.includes('--serve')){
    writeFileSync(environmentPath,JSON.stringify({id:randomUUID(),name:'TV6 local isolated fixtures',values:Object.entries(values).map(([key,value])=>({key,value:String(value),enabled:true,type:key==='password'?'secret':'default'})),_postman_variable_scope:'environment'},null,2));
    environmentWritten=true;
    console.log(`API ready: ${baseUrl}\nImport docs/postman/TV6.postman_collection.json and ${environmentPath}.\nSelect TV6 local isolated fixtures and Run collection once in order.\nPress Ctrl+C after saving your Postman screenshots. Fixtures will be cleaned.`);
    await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  }else{
    const newman=require(process.env.TV6_NEWMAN_MODULE || './tv6-tools/node_modules/newman');
    const collection=JSON.parse(readFileSync(resolve(here,'TV6.postman_collection.json'),'utf8'));
    const summary=await new Promise((complete,reject)=>newman.run({collection,envVar:Object.entries(values).map(([key,value])=>({key,value:String(value)})),reporters:['cli','json'],reporter:{json:{export:resolve(output,'newman.raw.json')}},timeoutRequest:15000},(error,result)=>error?reject(error):complete(result)));
    const state={customer:await db.user.findUnique({where:{id:accounts.customer.id},select:{id:true,loyaltyPoints:true}}),ingredient:await db.ingredient.findUnique({where:{id:ingredient.id}}),orders:await db.order.findMany({where:{userId:accounts.customer.id},include:{payments:true,ingredients:true,loyaltyTransaction:true}})};
    const checks=[
      {name:'Owner earned exactly 9 points once',pass:state.customer.loyaltyPoints===9},
      {name:'Final ingredient stock 200',pass:state.ingredient.stockQuantity===200},
      {name:'Exactly one loyalty ledger',pass:state.orders.filter(o=>o.loyaltyTransaction).length===1},
      {name:'Cancelled paid order preserves SUCCESS payment without loyalty',pass:state.orders.some(o=>o.status==='CANCELLED'&&o.payments.some(p=>p.status==='SUCCESS')&&!o.loyaltyTransaction)},
      {name:'Failed payment cancelled without points',pass:state.orders.some(o=>o.status==='CANCELLED'&&o.payments.some(p=>p.status==='FAILED')&&!o.loyaltyTransaction)}
    ];
    writeFileSync(resolve(output,'database-checks.json'),JSON.stringify({checks,state},null,2));
    const result={startedAt,finishedAt:new Date().toISOString(),stats:summary.run.stats,failures:summary.run.failures.map(f=>({source:f.source.name,error:f.error.message})),databaseChecks:checks,exitCode:summary.run.failures.length||checks.some(c=>!c.pass)?1:0};
    writeFileSync(resolve(output,'execution.json'),JSON.stringify(result,null,2));
    process.exitCode=result.exitCode;
  }
}finally{
  try {
    await db.order.deleteMany({where:{userId:{in:users}}});
    if(product)await db.product.delete({where:{id:product.id}});
    if(ingredient)await db.ingredient.delete({where:{id:ingredient.id}});
    await db.user.deleteMany({where:{id:{in:users}}});
    const remaining={users:await db.user.count({where:{id:{in:users}}}),orders:await db.order.count({where:{userId:{in:users}}}),products:product?await db.product.count({where:{id:product.id}}):0,ingredients:ingredient?await db.ingredient.count({where:{id:ingredient.id}}):0};
    writeFileSync(resolve(output,'cleanup.json'),JSON.stringify({finishedAt:new Date().toISOString(),remaining,passed:Object.values(remaining).every(v=>v===0)},null,2));
  }finally{
    await db.$disconnect();
    if(server){server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));}
    log.end();
    if(environmentWritten)writeFileSync(environmentPath,JSON.stringify({name:'TV6 fixtures cleaned - run --serve again',values:[],_postman_variable_scope:'environment'},null,2));
  }
}
