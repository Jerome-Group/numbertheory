import { readFileSync } from 'node:fs';

try {
  const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(
    `Automated verification: **${report.status}**. Release readiness: **${report.releaseReady === true ? 'confirmed' : 'not evaluated'}**.\n`,
  );
  for (const stage of report.stages ?? [])
    console.log(
      `- ${stage.stage}: ${stage.status}${stage.error ? ` — ${stage.error}` : ''}`,
    );
  for (const gate of report.manualGates ?? [])
    console.log(`- ${gate.stage}: ${gate.status}; required for release.`);
} catch (error) {
  console.error(`Verification report unavailable: ${error.message}`);
  process.exitCode = 1;
}
