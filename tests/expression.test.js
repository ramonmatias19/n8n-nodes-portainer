#!/usr/bin/env node
/**
 * Regression guard for issue #8 — "Invalid Syntax" when saving credentials.
 *
 * The trailing-slash strip was once written as a regex literal inside a
 * single-quoted string: '={{$credentials.baseUrl.replace(/\/+$/, "")}}/api'.
 * JS string escaping collapses \/ to /, so n8n actually parsed
 * replace(//+$/, "") — invalid syntax — and rejected every expression.
 *
 * This test extracts the real expressions from source and EVALUATES them.
 * A regex-literal regression throws SyntaxError here (fast fail), and the
 * trailing-slash behaviour is asserted for host / host/ inputs.
 *
 * Dependency-free. Run: node tests/expression.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const CRED = path.join(ROOT, 'credentials', 'PortainerApi.credentials.ts');
const NODE = path.join(ROOT, 'nodes', 'Portainer', 'Portainer.node.ts');

let failures = 0;
function check(name, fn) {
	try {
		fn();
		console.log(`[PASS] ${name}`);
	} catch (e) {
		failures++;
		console.log(`[FAIL] ${name}\n  ${e.message}`);
	}
}

/** Pull a single-quoted '={{...}}...' string literal that contains `needle`. */
function extractExpr(file, needle) {
	const text = fs.readFileSync(file, 'utf-8');
	// Expressions use double quotes internally, so '[^']*' is a safe match.
	const re = /'(=\{\{[^']*\}\}[^']*)'/g;
	let m;
	while ((m = re.exec(text)) !== null) {
		if (m[1].includes(needle)) return m[1];
	}
	throw new Error(`no '={{...}}' expression containing "${needle}" found in ${path.basename(file)}`);
}

/** Minimal n8n '={{ }}' renderer — evaluates each {{expr}} with $credentials bound. */
function render(tmpl, credentials) {
	const body = tmpl.startsWith('=') ? tmpl.slice(1) : tmpl;
	return body.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
		// new Function throws SyntaxError if a broken regex literal is reintroduced.
		const fn = new Function('$credentials', `return (${expr});`);
		return String(fn(credentials));
	});
}

const credUrl = extractExpr(CRED, 'users/me');
const nodeBaseUrl = extractExpr(NODE, '}}/api');

// 1. No regex literal embedded in either expression (the exact footgun).
for (const [label, expr] of [['credential test url', credUrl], ['node baseURL', nodeBaseUrl]]) {
	check(`${label} contains no regex-literal .replace(/.../)`, () => {
		assert.ok(!/\.replace\(\//.test(expr), `regex literal found: ${expr}`);
	});
}

// 2. Expressions are valid JS and strip the trailing slash correctly.
const cases = [
	{ in: 'https://portainer.example.com:9443', base: 'https://portainer.example.com:9443' },
	{ in: 'https://portainer.example.com:9443/', base: 'https://portainer.example.com:9443' },
	{ in: 'http://192.168.1.10:9000', base: 'http://192.168.1.10:9000' },
];

for (const c of cases) {
	check(`credential url resolves for "${c.in}"`, () => {
		const out = render(credUrl, { baseUrl: c.in });
		assert.strictEqual(out, `${c.base}/api/users/me`);
	});
	check(`node baseURL resolves for "${c.in}"`, () => {
		const out = render(nodeBaseUrl, { baseUrl: c.in });
		assert.strictEqual(out, `${c.base}/api`);
	});
}

console.log('');
if (failures > 0) {
	console.log(`=== ${failures} check(s) FAILED ===`);
	process.exit(1);
}
console.log('=== all expression checks passed ===');
process.exit(0);
