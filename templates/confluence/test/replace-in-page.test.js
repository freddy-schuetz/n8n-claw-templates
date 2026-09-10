'use strict';
// Tests fuer Confluence 1.8.0 replace_in_page und den space_key-Fehler aus 1.7.2, mit dem
// echten Knotencode (sub.nodes[type=code].parameters.jsCode) und gefaelschten HTTP-Aufrufen.
// Aufruf: node templates/confluence/test/replace-in-page.test.js
const fs = require('fs');
const path = require('path');
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);
const SITE = 'test.atlassian.net';
const V2 = 'https://' + SITE + '/wiki/api/v2';
const SEITE = '<p>Einleitung</p><table><colgroup><col /></colgroup><tbody><tr><th>Aufgabe</th></tr><tr><td>Website pr&uuml;fen</td></tr></tbody></table>' +
  '<h2>Weitere Aufgaben</h2><table><tbody><tr><td>Kataloge pr&uuml;fen</td></tr></tbody></table><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Hinweis</p></ac:rich-text-body></ac:structured-macro>' + '<p>Fuelltext</p>'.repeat(40);
function makeHelpers(opts) {
  opts = opts || {}; const log = [];
  async function httpRequest(req) {
    log.push(req); const url = String(req.url); const method = (req.method || 'GET').toUpperCase();
    if (url.includes('/rest/v1/template_credentials')) return [{ cred_key: 'atlassian_email', cred_value: 'b@x' }, { cred_key: 'atlassian_api_token', cred_value: 't' }, { cred_key: 'atlassian_site', cred_value: SITE }];
    if (url.startsWith(V2 + '/spaces?keys=')) return { results: opts.spaceOk ? [{ id: '417333258', key: 'PRO28' }] : [] };
    if (method === 'GET' && url.startsWith(V2 + '/pages/1217626113')) return { id: '1217626113', title: 'EmpCo', version: { number: 8 }, body: { storage: { value: opts.body || SEITE } }, _links: { webui: '/spaces/TM/pages/1217626113' } };
    if (method === 'PUT' && url === V2 + '/pages/1217626113') { const b = JSON.parse(req.body); return { id: '1217626113', title: b.title, version: b.version, _links: { webui: '/spaces/TM/pages/1217626113' } }; }
    throw new Error('unmocked request: ' + method + ' ' + url);
  }
  return { helpers: { httpRequest }, log };
}
async function run(input, opts) { const m = makeHelpers(opts); const out = await logic({ first: () => ({ json: input }) }, m.helpers); return { json: out[0].json, log: m.log }; }
const putBody = log => { const p = log.find(r => (r.method || '').toUpperCase() === 'PUT'); return p ? JSON.parse(p.body) : null; };
const cases = []; function test(n, f) { cases.push({ n, f }); }
function assert(c, m) { if (!c) throw new Error(m); }
function inc(h, n, w) { assert(typeof h === 'string' && h.includes(n), (w || 'text') + ' sollte "' + n + '" enthalten, war: ' + JSON.stringify(h)); }
const BASIS = { action: 'replace_in_page', caller: 'web:barbara', page_id: '1217626113', expected_version: '8' };

test('Zeile verschieben: eine Tabellenzeile an anderer Stelle einsetzen und die Nebentabelle entfernen', async () => {
  const find = '<h2>Weitere Aufgaben</h2><table><tbody><tr><td>Kataloge pr&uuml;fen</td></tr></tbody></table>';
  const { json, log } = await run(Object.assign({}, BASIS, { find, replace: '' }));
  assert(json.result, JSON.stringify(json));
  const b = putBody(log); assert(b && !b.body.value.includes('Weitere Aufgaben'), 'Nebentabelle weg');
  assert(b.version.number === 9 && b.title === 'EmpCo', 'Version 9, Titel bleibt');
  inc(json.result, 'updated to v9'); inc(json.result, 'replaced 1 occurrence');
  const r2 = await run(Object.assign({}, BASIS, { find: '<tr><td>Website pr&uuml;fen</td></tr>', replace: '<tr><td>Website pr&uuml;fen</td></tr><tr><td>Kataloge pr&uuml;fen</td></tr>' }));
  assert(putBody(r2.log).body.value.includes('<tr><td>Website pr&uuml;fen</td></tr><tr><td>Kataloge pr&uuml;fen</td></tr>'), 'Zeile eingesetzt');
});
test('Umlaute als Zeichen finden die Entities in der Seite', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { find: '<td>Website prüfen</td>', replace: '<td>Website geprüft</td>' }));
  assert(json.result, JSON.stringify(json));
  assert(putBody(log).body.value.includes('<td>Website gepr&uuml;ft</td>'), putBody(log).body.value.slice(0, 200));
});
test('find nicht gefunden: klare Meldung, nichts geschrieben', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { find: '<p>gibt es nicht</p>', replace: 'x' }));
  inc(json.error || '', 'was not found'); assert(!putBody(log), 'kein PUT');
});
test('mehrdeutig ohne all: abgelehnt; mit all=true alle ersetzt', async () => {
  const r1 = await run(Object.assign({}, BASIS, { find: '<p>Fuelltext</p>', replace: '<p>Text</p>' }));
  inc(r1.json.error || '', 'occurs 40 times'); assert(!putBody(r1.log), 'kein PUT');
  const r2 = await run(Object.assign({}, BASIS, { find: '<p>Fuelltext</p>', replace: '<p>Text</p>', all: 'true' }));
  assert(r2.json.result && !putBody(r2.log).body.value.includes('Fuelltext'), JSON.stringify(r2.json));
  inc(r2.json.result, 'replaced 40 occurrence');
});
test('Versionskonflikt: nichts geschrieben', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { expected_version: '7', find: '<p>Einleitung</p>', replace: '<p>Neu</p>' }));
  inc(json.error || '', 'Version conflict'); assert(!putBody(log), 'kein PUT');
});
test('Makro entfernen nur mit allow_format_loss', async () => {
  const find = '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Hinweis</p></ac:rich-text-body></ac:structured-macro>';
  const r1 = await run(Object.assign({}, BASIS, { find, replace: '' }));
  inc(r1.json.error || '', 'lose structure'); assert(!putBody(r1.log), 'kein PUT');
  const r2 = await run(Object.assign({}, BASIS, { find, replace: '', allow_format_loss: 'true' }));
  assert(r2.json.result, JSON.stringify(r2.json));
});
test('starkes Schrumpfen nur mit allow_shrink', async () => {
  const r1 = await run(Object.assign({}, BASIS, { find: '<p>Fuelltext</p>', replace: '', all: 'true' }));
  inc(r1.json.error || '', 'shrink'); assert(!putBody(r1.log), 'kein PUT');
  const r2 = await run(Object.assign({}, BASIS, { find: '<p>Fuelltext</p>', replace: '', all: 'true', allow_shrink: 'true' }));
  assert(r2.json.result, JSON.stringify(r2.json));
});
test('ohne find: Hinweis auf get_page format=storage', async () => {
  const { json } = await run(Object.assign({}, BASIS, { replace: 'x' }));
  inc(json.error || '', 'get_page format=storage');
});
test('1.7.2: unbekannter space_key ist ein Fehler, kein stilles Weglassen', async () => {
  const { json, log } = await run({ action: 'get_page_by_title', caller: 'web:barbara', title: 'EmpCo', space_key: 'GIBTSNICHT' });
  inc(json.error || '', 'nicht gefunden'); assert(!log.some(r => String(r.url).includes('/pages?title=')), 'keine Titelsuche ohne Bereich');
});
test('Server: replace_in_page verdrahtet, Werkzeugname stimmt, update_page verweist darauf', async () => {
  const n = wf.server.nodes.find(x => x.name === 'replace_in_page');
  assert(n && n.parameters.name === 'replace_in_page' && n.parameters.workflowInputs.value.action === 'replace_in_page', 'Knoten');
  assert(wf.server.connections.replace_in_page, 'Verbindung');
  assert(['page_id', 'find', 'replace', 'all', 'expected_version'].every(k => n.parameters.workflowInputs.schema.some(s => s.id === k)), 'Schema');
  inc(wf.server.nodes.find(x => x.name === 'update_page').parameters.description, 'replace_in_page');
});
(async () => {
  let ok = 0, fail = 0;
  for (const c of cases) { try { await c.f(); ok++; console.log('ok   ' + c.n); } catch (e) { fail++; console.log('FAIL ' + c.n + '\n     ' + e.message); } }
  console.log('\n' + ok + ' von ' + (ok + fail) + ' Faellen bestanden'); process.exit(fail ? 1 : 0);
})();
