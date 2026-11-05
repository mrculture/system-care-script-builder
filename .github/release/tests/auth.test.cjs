const {test}=require('node:test');
const assert=require('node:assert/strict');
const {verifyAuth}=require('../auth.cjs');
const targets=[{kind:'pages',name:'approved-project'}];
const accountLookup=async()=>{throw new Error('Failed to automatically retrieve account IDs for the logged in user.');};
test('Pages-only token can authenticate through its exact project',async()=>{
  const calls=[];
  await verifyAuth(targets,accountLookup,async name=>{calls.push(name);return {name};},()=>{});
  assert.deepEqual(calls,['approved-project']);
});
test('denied project access blocks the Pages fallback',async()=>{
  await assert.rejects(verifyAuth(targets,accountLookup,async()=>{throw new Error('HTTP 403');}),/403/);
});
test('unexpected project blocks authentication',async()=>{
  await assert.rejects(verifyAuth(targets,accountLookup,async()=>({name:'wrong-project'})),/unexpected project/);
});
test('other authentication errors never use the fallback',async()=>{
  await assert.rejects(verifyAuth(targets,async()=>{throw new Error('Invalid token');},async()=>{assert.fail('Fallback called');}),/Invalid token/);
});
test('Worker targets never use a Pages-only fallback',async()=>{
  await assert.rejects(verifyAuth([{kind:'worker',name:'hub'}],accountLookup,async()=>{assert.fail('Fallback called');}),/account IDs/);
});
