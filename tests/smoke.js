#!/usr/bin/env node
/**
 * Smoke test Portainer API — READ-ONLY only (safe for production).
 * Hits endpoints used by the node routing to validate compatibility with real Portainer server.
 *
 * Run: node tests/smoke.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnv() {
	const envPath = path.join(__dirname, '..', '.env.test');
	if (!fs.existsSync(envPath)) {
		console.error('[FATAL] .env.test not found at', envPath);
		process.exit(1);
	}
	const content = fs.readFileSync(envPath, 'utf-8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const val = trimmed.slice(eq + 1).trim();
		if (!process.env[key]) process.env[key] = val;
	}
}
loadEnv();

const BASE = (process.env.PORTAINER_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.PORTAINER_API_KEY;
const IGNORE_SSL = (process.env.PORTAINER_IGNORE_SSL || 'false').toLowerCase() === 'true';

if (!BASE || !KEY) {
	console.error('[FATAL] PORTAINER_BASE_URL or PORTAINER_API_KEY missing in .env.test');
	process.exit(1);
}

const agent = IGNORE_SSL ? new https.Agent({ rejectUnauthorized: false }) : undefined;
const results = [];

async function req(name, pathRel, validator, { method = 'GET', body } = {}) {
	const url = `${BASE}/api${pathRel}`;
	const started = Date.now();
	try {
		const res = await fetch(url, {
			method,
			headers: {
				'X-API-Key': KEY,
				Accept: 'application/json',
				...(body ? { 'Content-Type': 'application/json' } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
			dispatcher: agent ? undefined : undefined, // native fetch in node 22 doesn't accept https.Agent directly
		});
		const elapsed = Date.now() - started;
		const text = await res.text();
		let json;
		try {
			json = JSON.parse(text);
		} catch {
			json = { __raw: text.slice(0, 200) };
		}
		let ok = res.ok;
		let validationErr = null;
		if (ok && validator) {
			try {
				validator(json);
			} catch (e) {
				ok = false;
				validationErr = e.message;
			}
		}
		results.push({ name, url, status: res.status, elapsed, ok, validationErr });
		const mark = ok ? 'PASS' : 'FAIL';
		console.log(`[${mark}] ${name.padEnd(32)} ${method} ${pathRel} — HTTP ${res.status} in ${elapsed}ms`);
		if (!ok) {
			const preview = JSON.stringify(json).slice(0, 300);
			console.log(`  body: ${preview}${preview.length >= 300 ? '…' : ''}`);
			if (validationErr) console.log(`  validation: ${validationErr}`);
		} else {
			const preview = JSON.stringify(json).slice(0, 180);
			console.log(`  ok: ${preview}${preview.length >= 180 ? '…' : ''}`);
		}
		return { res, json };
	} catch (err) {
		const elapsed = Date.now() - started;
		results.push({ name, url, status: 0, elapsed, ok: false, error: err.message });
		console.log(`[FAIL] ${name.padEnd(32)} ${method} ${pathRel} — network error: ${err.message}`);
		return { res: null, json: null };
	}
}

function assertArray(val, name) {
	if (!Array.isArray(val)) throw new Error(`${name} is not array (got ${typeof val})`);
}
function assertHas(obj, key) {
	if (obj == null || !(key in obj)) throw new Error(`missing field: ${key}`);
}

async function main() {
	console.log('=== Portainer smoke test (read-only) ===');
	console.log('Base URL:', BASE);
	console.log('API Key :', KEY.slice(0, 8) + '…' + KEY.slice(-4));
	console.log('Ignore SSL:', IGNORE_SSL);
	console.log('');

	// --- Credential test + user/server info
	await req('users.me', '/users/me', (j) => assertHas(j, 'Id'));
	await req('status', '/status', (j) => assertHas(j, 'Version'));
	await req('system.version', '/system/version', (j) => assertHas(j, 'ServerVersion'));
	await req('system.nodes', '/system/nodes', (j) => assertHas(j, 'nodes'));

	// --- Collections used by node routing
	await req('settings', '/settings', (j) => assertHas(j, 'TemplatesURL'));
	await req('teams', '/teams', (j) => assertArray(j, 'teams'));
	await req('users', '/users', (j) => assertArray(j, 'users'));
	await req('registries', '/registries', (j) => assertArray(j, 'registries'));
	await req('templates', '/templates', (j) => j); // shape varies
	await req('webhooks', '/webhooks', (j) => assertArray(j, 'webhooks'));
	await req('stacks', '/stacks', (j) => assertArray(j, 'stacks'));
	await req('edge_groups', '/edge_groups', (j) => assertArray(j, 'edge_groups'));
	await req('edge_stacks', '/edge_stacks', (j) => assertArray(j, 'edge_stacks'));

	// --- Endpoints (environments) + Docker-specific collections on first env
	const endpointsResp = await req('endpoints', '/endpoints', (j) => assertArray(j, 'endpoints'));
	const firstEnv = Array.isArray(endpointsResp.json) ? endpointsResp.json[0] : null;
	if (firstEnv) {
		const envId = firstEnv.Id;
		console.log(`\n--- Testing Docker endpoints on env ${envId} (${firstEnv.Name}) ---`);
		await req('env.get', `/endpoints/${envId}`, (j) => assertHas(j, 'Id'));
		await req('containers.list', `/endpoints/${envId}/docker/containers/json?all=true`, (j) => assertArray(j, 'containers'));
		await req('images.list', `/endpoints/${envId}/docker/images/json`, (j) => assertArray(j, 'images'));
		await req('networks.list', `/endpoints/${envId}/docker/networks`, (j) => assertArray(j, 'networks'));
		await req('volumes.list', `/endpoints/${envId}/docker/volumes`, (j) => assertHas(j, 'Volumes'));
		await req('services.list', `/endpoints/${envId}/docker/services`, (j) => j);
		await req('secrets.list', `/endpoints/${envId}/docker/secrets`, (j) => j);
		await req('configs.list', `/endpoints/${envId}/docker/configs`, (j) => j);
		await req('docker.info', `/endpoints/${envId}/docker/info`, (j) => assertHas(j, 'ServerVersion'));
	} else {
		console.log('\n[SKIP] no endpoints available — skipping Docker tests');
	}

	// --- Summary
	console.log('');
	console.log('=== Summary ===');
	const pass = results.filter((r) => r.ok).length;
	const fail = results.length - pass;
	console.log(`Pass: ${pass}/${results.length} · Fail: ${fail}`);
	for (const r of results) {
		const mark = r.ok ? 'OK  ' : 'FAIL';
		console.log(`  ${mark} ${r.name.padEnd(24)} HTTP ${r.status} (${r.elapsed}ms)`);
	}

	process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error('[FATAL]', err);
	process.exit(1);
});
