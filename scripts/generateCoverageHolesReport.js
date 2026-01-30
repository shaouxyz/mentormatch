// Generate a detailed coverage holes report from coverage/coverage-final.json
// Outputs markdown to COVERAGE_HOLES.md

const fs = require('fs');
const path = require('path');

function main() {
  const covPath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
  if (!fs.existsSync(covPath)) {
    console.error('coverage-final.json not found. Run `npm run test:coverage` first.');
    process.exit(1);
  }

  const cov = require(covPath);
  let out = '# Coverage Holes Report\n\n';

  for (const [file, info] of Object.entries(cov)) {
    const stmts = info.statementMap || {};
    const sHits = info.s || {};
    const branches = info.branchMap || {};
    const bHits = info.b || {};
    const fns = info.fnMap || {};
    const fHits = info.f || {};

    const uncoveredStmts = [];
    for (const id of Object.keys(stmts)) {
      const hits = sHits[id] || 0;
      if (!hits) {
        const locObj = stmts[id];
        const loc = (locObj && (locObj.start || locObj.loc?.start)) || {};
        uncoveredStmts.push({ id, line: loc.line || (loc.start && loc.start.line) || '?' });
      }
    }

    const uncoveredBranches = [];
    for (const id of Object.keys(branches)) {
      const br = branches[id];
      const hitsArr = bHits[id] || [];
      if (!br || !br.locations) continue;
      br.locations.forEach((locObj, idx) => {
        const hits = hitsArr[idx] || 0;
        if (!hits) {
          const loc = (locObj && (locObj.start || locObj.loc?.start)) || {};
          uncoveredBranches.push({
            id,
            idx,
            line: loc.line || (loc.start && loc.start.line) || '?',
            type: br.type || 'branch',
          });
        }
      });
    }

    const uncoveredFns = [];
    for (const id of Object.keys(fns)) {
      const hits = fHits[id] || 0;
      if (!hits) {
        const fn = fns[id];
        const locObj = fn && (fn.loc && fn.loc.start) || (fn.decl && fn.decl.loc && fn.decl.loc.start) || {};
        uncoveredFns.push({
          id,
          name: fn && fn.name ? fn.name : '',
          line: locObj.line || (locObj.start && locObj.start.line) || '?',
        });
      }
    }

    if (!uncoveredStmts.length && !uncoveredBranches.length && !uncoveredFns.length) {
      continue;
    }

    out += `## ${file}\n\n`;

    if (uncoveredStmts.length) {
      out += '### Uncovered Statements\n';
      for (const u of uncoveredStmts) {
        out += `- id ${u.id} at line ${u.line}\n`;
      }
      out += '\n';
    }

    if (uncoveredBranches.length) {
      out += '### Uncovered Branches\n';
      for (const u of uncoveredBranches) {
        out += `- id ${u.id} branch ${u.idx} (${u.type}) at line ${u.line}\n`;
      }
      out += '\n';
    }

    if (uncoveredFns.length) {
      out += '### Uncovered Functions\n';
      for (const u of uncoveredFns) {
        out += `- id ${u.id} (${u.name || 'anonymous'}) at line ${u.line}\n`;
      }
      out += '\n';
    }
  }

  const outPath = path.join(__dirname, '..', 'COVERAGE_HOLES.md');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log('Wrote coverage hole report to COVERAGE_HOLES.md');
}

main();

