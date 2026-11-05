// Pages-only tokens may deploy without permission to enumerate user accounts.
async function verifyAuth(targets, whoami, getProject, log=console.log) {
  try { await whoami(); return; } catch (error) {
    if (!targets.length || !targets.every(target=>target.kind==='pages') ||
        !/Failed to automatically retrieve account IDs/.test(error.message)) throw error;
  }
  for (const target of targets) {
    const project=await getProject(target.name);
    if (project?.name!==target.name) throw new Error('Cloudflare returned an unexpected project during authentication.');
  }
  log('Pages-only authentication verified against every configured project.');
}
module.exports={verifyAuth};
