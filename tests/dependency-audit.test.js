const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

// Only the required `test` job gates every pull request; an audit that lives in
// the `docker` job would not run for changes that skip the image build.
const [testJob] = workflow.split(/\n {2}docker:\n/);
const auditCommand = 'npm audit --omit=dev --audit-level=high';

test('the required test job audits production dependencies', () => {
    assert.match(testJob, /^ {2}test:$/m, 'the required "test" job must keep its name');
    assert.ok(
        testJob.includes(auditCommand),
        `.github/workflows/ci.yml must run "${auditCommand}" in the test job`,
    );
});

test('the audit runs after npm ci so it reads the installed tree', () => {
    const install = testJob.indexOf('run: npm ci');
    const audit = testJob.indexOf(auditCommand);
    assert.ok(install !== -1, 'the test job must keep running npm ci');
    assert.ok(audit > install, 'run the dependency audit after npm ci');
});

test('the audit gates high-severity advisories and ignores dev-only ones', () => {
    assert.match(testJob, /--omit=dev\b/, 'dev-only advisories must not gate the job');
    assert.match(testJob, /--audit-level=high\b/, 'the job must gate high-severity advisories');
});
