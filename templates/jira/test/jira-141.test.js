'use strict';
// Tests fuer Jira 1.4.1 (18.09.2026): transition_issue liest den Status nach
// (Florian Schumacher, 11.09.2026: "Rupert hat behauptet, Tickets stuenden
// bereits auf Offen, ohne den tatsaechlichen Status geprueft zu haben"), und
// Fehlertexte sind lesbar, auch wenn Jira ein Objekt liefert (am 14.09.2026
// stand im Protokoll von list_users nur "[object Object]").
// Aufruf: node templates/jira/test/jira-141.test.js
const fs = require('fs');
const path = require('path');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);
const SITE = 'test.atlassian.net';
const API = 'https://' + SITE + '/rest/api/3';

const TRANS = [
  { id: '11', name: 'Zurueck zu Offen', to: { name: 'Offen' } },
  { id: '21', name: 'In Arbeit nehmen', to: { name: 'In Arbeit' } },
  { id: '31', name: 'Fertig', to: { name: 'Erledigt' } }
];

function makeHelpers(opts) {
  opts = opts || {};
  const log = [];
  async function httpRequest(req) {
    log.push(req);
    const url = String(req.url);
    const method = (req.method || 'GET').toUpperCase();
    if (url.includes('/rest/v1/template_credentials')) return [
      { cred_key: 'atlassian_email', cred_value: 'bot@example.com' },
      { cred_key: 'atlassian_api_token', cred_value: 't' },
      { cred_key: 'atlassian_site', cred_value: SITE }];
    if (url === API + '/field') return [];
    if (method === 'GET' && url.indexOf('/transitions') > 0) return { transitions: TRANS };
    if (method === 'POST' && url.indexOf('/transitions') > 0) {
      if (opts.postFehler) throw opts.postFehler;
      return {};
    }
    if (method === 'GET' && url.indexOf('?fields=status') > 0) {
      if (opts.leseFehler) throw new Error('Request failed with status code 500');
      return { fields: { status: { name: opts.statusDanach || 'In Arbeit' } } };
    }
    if (url.startsWith(API + '/user/search?')) {
      if (opts.suchFehler) throw opts.suchFehler;
      return [];
    }
    throw new Error('unmocked request: ' + method + ' ' + url);
  }
  return { helpers: { httpRequest }, log };
}
async function run(input, opts) {
  const m = makeHelpers(opts);
  const out = await logic({ first: () => ({ json: input }) }, m.helpers);
  return { json: out[0].json, log: m.log };
}

const cases = [];
function test(n, f) { cases.push({ name: n, fn: f }); }
function assert(c, m) { if (!c) throw new Error(m); }

test('transition_issue meldet den Status, den Jira danach wirklich zeigt', async () => {
  const { json, log } = await run({ action: 'transition_issue', key: 'OM-42', transition: 'In Arbeit' }, { statusDanach: 'In Arbeit' });
  assert(json.result, JSON.stringify(json));
  assert(/Status now \(read back from Jira\): In Arbeit/.test(json.result), 'nachgelesener Status fehlt: ' + json.result);
  assert(log.some(r => String(r.url).indexOf('?fields=status') > 0), 'es wurde gar nicht nachgelesen');
});

test('weicht der echte Status vom Ziel der Transition ab, gilt der echte', async () => {
  const { json } = await run({ action: 'transition_issue', key: 'OM-42', transition: 'Fertig' }, { statusDanach: 'Wartet auf Freigabe' });
  assert(/Status now \(read back from Jira\): Wartet auf Freigabe/.test(json.result), json.result);
  assert(!/Status now.*Erledigt/.test(json.result), 'das Ziel der Transition darf nicht als Status ausgegeben werden: ' + json.result);
});

test('scheitert das Nachlesen, wird das gesagt statt behauptet', async () => {
  const { json } = await run({ action: 'transition_issue', key: 'OM-42', transition: 'Fertig' }, { leseFehler: true });
  assert(/could NOT be read back/.test(json.result), json.result);
  assert(/unconfirmed/.test(json.result), json.result);
  assert(!/Status now/.test(json.result), 'kein behaupteter Status: ' + json.result);
});

test('unbekannte Transition wird weiter mit der Liste abgelehnt', async () => {
  const { json, log } = await run({ action: 'transition_issue', key: 'OM-42', transition: 'Schwebt' }, {});
  assert(/No transition matching/.test(json.error), JSON.stringify(json));
  assert(/Zurueck zu Offen/.test(json.error), json.error);
  assert(!log.some(r => (r.method || 'GET').toUpperCase() === 'POST'), 'nichts geaendert');
});

test('Fehlerobjekt aus Jira wird lesbar, nicht [object Object]', async () => {
  const err = new Error('x');
  err.message = { errorMessages: ['Feld fehlt'] };
  const { json } = await run({ action: 'list_users', query: 'f.schumacher@example.com' }, { suchFehler: err });
  assert(json.error && json.error.indexOf('[object Object]') < 0, 'immer noch unlesbar: ' + json.error);
  assert(/Feld fehlt/.test(json.error), json.error);
});

test('errorMessages aus dem Antwortrumpf werden genannt', async () => {
  const err = new Error('Request failed with status code 400');
  err.response = { body: { errorMessages: ['Issue does not exist'], errors: {} } };
  const { json } = await run({ action: 'list_users', query: 'x' }, { suchFehler: err });
  assert(/Issue does not exist/.test(json.error), json.error);
});

test('Feldfehler aus errors werden mit Feldnamen genannt', async () => {
  const err = new Error('Request failed with status code 400');
  err.response = { body: { errorMessages: [], errors: { assignee: 'Field cannot be set' } } };
  const { json } = await run({ action: 'list_users', query: 'x' }, { suchFehler: err });
  assert(/assignee: Field cannot be set/.test(json.error), json.error);
});

test('einfacher Textfehler bleibt unveraendert', async () => {
  const { json } = await run({ action: 'list_users', query: 'x' }, { suchFehler: new Error('socket hang up') });
  assert(/socket hang up/.test(json.error), json.error);
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
