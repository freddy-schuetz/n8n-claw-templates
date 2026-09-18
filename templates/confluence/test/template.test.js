'use strict';
// Tests fuer Confluence 1.9.0 (18.09.2026): create_page mit einem Layout.
// Sophie Strasser am 16.09.2026: "Confluence-Inhalte koennen nur als normale
// Seite angelegt werden, eigene Vorlagentypen wie Besprechungsprotokoll werden
// vom Werkzeug nicht unterstuetzt." Confluence-Blaupausen lassen sich ueber die
// API nicht auswaehlen, die Struktur aber anlegen; das Werkzeug sagt beides.
// Aufruf: node templates/confluence/test/template.test.js
const fs = require('fs');
const path = require('path');
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);
const SITE = 'test.atlassian.net';
const V2 = 'https://' + SITE + '/wiki/api/v2';

function makeHelpers() {
  const log = [];
  async function httpRequest(req) {
    log.push(req);
    const url = String(req.url);
    const method = (req.method || 'GET').toUpperCase();
    if (url.includes('/rest/v1/template_credentials')) return [
      { cred_key: 'atlassian_email', cred_value: 'b@x' },
      { cred_key: 'atlassian_api_token', cred_value: 't' },
      { cred_key: 'atlassian_site', cred_value: SITE }];
    if (method === 'POST' && url === V2 + '/pages') {
      const b = JSON.parse(req.body);
      return { id: '1228144643', title: b.title, _links: { webui: '/spaces/DP/pages/1228144643' } };
    }
    throw new Error('unmocked request: ' + method + ' ' + url);
  }
  return { helpers: { httpRequest }, log };
}
async function run(input) {
  const m = makeHelpers();
  const out = await logic({ first: () => ({ json: input }) }, m.helpers);
  return { json: out[0].json, log: m.log };
}
const postBody = log => {
  const p = log.find(r => (r.method || '').toUpperCase() === 'POST' && String(r.url).endsWith('/pages'));
  return p ? JSON.parse(p.body) : null;
};

const cases = [];
function test(n, f) { cases.push({ name: n, fn: f }); }
function assert(c, m) { if (!c) throw new Error(m); }

const BASIS = { action: 'create_page', caller: 'web:sophie', space_id: '743178242', parent_id: '743178242' };

test('Besprechungsprotokoll: alle Abschnitte stehen in der Seite', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { title: 'Daily Dose of Goodguys Meetings', template: 'besprechungsprotokoll', meeting_date: '08.09.2026' }));
  assert(json.result, JSON.stringify(json));
  const b = postBody(log);
  const v = b.body.value;
  for (const teil of ['Datum', 'Uhrzeit', 'Teilnehmende', 'Neuigkeiten und Status', 'Themen', 'Entscheidungen', 'Aufgaben', 'Offene Fragen']) {
    assert(v.indexOf(teil) >= 0, 'Abschnitt fehlt: ' + teil);
  }
  assert(v.indexOf('08.09.2026') >= 0, 'Datum fehlt');
  assert(/<th><p>Was<\/p><\/th><th><p>Wer<\/p><\/th><th><p>Bis wann<\/p><\/th>/.test(v), 'Aufgabentabelle fehlt');
  assert(b.title === 'Daily Dose of Goodguys Meetings', 'Titel: ' + b.title);
  assert(b.parentId === '743178242', 'Elternseite fehlt');
});

test('ohne meeting_date steht das heutige Datum drin', async () => {
  const { log } = await run(Object.assign({}, BASIS, { title: 'Protokoll', template: 'besprechungsprotokoll' }));
  const v = postBody(log).body.value;
  assert(/\d{1,2}\.\d{1,2}\.\d{4}/.test(v), 'kein Datum: ' + v.slice(0, 200));
});

test('das Werkzeug sagt, dass es kein echter Vorlagentyp ist', async () => {
  const { json } = await run(Object.assign({}, BASIS, { title: 'Protokoll', template: 'besprechungsprotokoll' }));
  assert(/blueprint types.*cannot be chosen through the API/.test(json.result), json.result);
});

test('Schreibweise mit Bindestrich und Grossbuchstaben wird erkannt', async () => {
  for (const schreibweise of ['Besprechungsprotokoll', 'besprechungs-protokoll', 'BESPRECHUNGS PROTOKOLL']) {
    const { json } = await run(Object.assign({}, BASIS, { title: 'P', template: schreibweise }));
    assert(json.result, schreibweise + ' nicht erkannt: ' + JSON.stringify(json));
  }
});

test('eigener Text wird an das Layout angehaengt, nicht verworfen', async () => {
  const { log } = await run(Object.assign({}, BASIS, { title: 'P', template: 'besprechungsprotokoll', body: '<h2>Meeting vom 08.09.2026</h2>' }));
  const v = postBody(log).body.value;
  assert(v.indexOf('Offene Fragen') >= 0 && v.indexOf('Meeting vom 08.09.2026') >= 0, 'beides muss drin sein');
});

test('unbekanntes Layout wird abgelehnt und nennt die vorhandenen', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { title: 'P', template: 'blogpost-vorlage' }));
  assert(/Unknown template/.test(json.error), JSON.stringify(json));
  assert(/besprechungsprotokoll/.test(json.error), json.error);
  assert(/cannot be selected through the API/.test(json.error), json.error);
  assert(!postBody(log), 'es darf nichts angelegt werden');
});

test('ohne template bleibt alles wie vorher', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { title: 'Normal', body: '<p>Hallo</p>' }));
  assert(json.result && !/blueprint types/.test(json.result), json.result);
  assert(postBody(log).body.value === '<p>Hallo</p>', 'Rumpf unveraendert');
});

test('ohne body und ohne template kommt der alte Hinweis, jetzt mit dem Ausweg', async () => {
  const { json } = await run(Object.assign({}, BASIS, { title: 'Leer' }));
  assert(/"body" is required/.test(json.error), JSON.stringify(json));
  assert(/use template/.test(json.error), json.error);
});

(async () => {
  let ok = 0, fail = 0;
  for (const c of cases) {
    try { await c.fn(); ok++; console.log('ok   ' + c.name); }
    catch (e) { fail++; console.log('FAIL ' + c.name + '\n     ' + e.message); }
  }
  console.log('\n' + ok + ' von ' + (ok + fail) + ' Faellen bestanden');
  process.exit(fail ? 1 : 0);
})();
