'use strict';
// Tests fuer Jira 1.4.0 (10.09.2026): Selbstbezug beim Bearbeiter ueber caller_name,
// kein stiller unscharfer Einzeltreffer mehr, Vorgangstyp wird vor dem Anlegen
// gegen das Projekt geprueft, parent in drei Formen, Ebenen in list_issue_types,
// Bearbeiter in der Erfolgsmeldung, kein Rueckfall auf den ersten Typ.
// Aufruf: node templates/jira/test/jira-14.test.js
const fs = require('fs');
const path = require('path');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);
const SITE = 'test.atlassian.net';
const API = 'https://' + SITE + '/rest/api/3';

const FLORIAN = { accountId: '712020:flo', displayName: 'Florian Schumacher', emailAddress: 'f.schumacher@example.com', accountType: 'atlassian' };
const MARTINA = { accountId: '712020:mar', displayName: 'Martina Rechner-Meilinger', emailAddress: 'm.rechner@example.com', accountType: 'atlassian' };
const MICHAEL_A = { accountId: '712020:ma', displayName: 'Michael Ammer', emailAddress: 'michael.ammer@example.com', accountType: 'atlassian' };
const MICHAEL_B = { accountId: '712020:mb', displayName: 'Michael Berger', emailAddress: 'michael.berger@example.com', accountType: 'atlassian' };
const TYPEN = [
  { id: '10000', name: 'Arbeitspaket', hierarchyLevel: 1 },
  { id: '10001', name: 'Aufgabe', hierarchyLevel: 0 },
  { id: '10002', name: 'Unteraufgabe', hierarchyLevel: -1, subtask: true }
];

function makeHelpers(opts) {
  opts = opts || {};
  const log = [];
  async function httpRequest(req) {
    log.push(req);
    const url = String(req.url); const dec = decodeURIComponent(url); const method = (req.method || 'GET').toUpperCase();
    if (url.includes('/rest/v1/template_credentials')) return [
      { cred_key: 'atlassian_email', cred_value: 'bot@example.com' }, { cred_key: 'atlassian_api_token', cred_value: 't' }, { cred_key: 'atlassian_site', cred_value: SITE }];
    if (url === API + '/field') return [];
    if (url.startsWith(API + '/user/search?')) {
      // Jira sucht unscharf: "me" trifft Martina (Rechner-MEilinger), so wie live am 09.09.2026
      if (dec.includes('query=me&')) return [MARTINA];
      if (dec.includes('query=Florian Schumacher')) return [FLORIAN];
      if (dec.includes('query=Florian')) return [FLORIAN];
      if (dec.includes('query=Michael')) return [MICHAEL_A, MICHAEL_B];
      if (dec.includes('query=Schumi')) return [FLORIAN];
      if (dec.includes('query=Mike Ammer')) return [MICHAEL_A];
      return [];
    }
    if (method === 'POST' && /\/issue\/OM-\d+\/comment$/.test(url)) return { id: '900' };
    if (url.startsWith(API + '/search/jql?')) return { issues: [], total: 0 };
    if (url === API + '/issue/createmeta/OM/issuetypes') { if (opts.typenFehler) throw new Error('createmeta weg'); return { issueTypes: TYPEN }; }
    if (/\/issue\/createmeta\/OM\/issuetypes\/\d+$/.test(url)) return { fields: [{ fieldId: 'summary', name: 'Zusammenfassung', required: true, schema: { type: 'string' } }] };
    if (method === 'POST' && url === API + '/issue') {
      if (opts.postFail) return { statusCode: 400, body: { errorMessages: [], errors: { customfield_1: 'Pflicht' } } };
      return { statusCode: 201, body: { id: '1', key: 'OM-77' } };
    }
    if (method === 'PUT' && /\/issue\/OM-\d+$/.test(url)) return { statusCode: 204, body: '' };
    if (/\/issue\/OM-\d+\/editmeta$/.test(url)) return { fields: {} };
    throw new Error('unmocked request: ' + method + ' ' + url);
  }
  return { helpers: { httpRequest }, log };
}
async function run(input, opts) {
  const m = makeHelpers(opts);
  const out = await logic({ first: () => ({ json: input }) }, m.helpers);
  return { json: out[0].json, log: m.log };
}
const postBody = log => JSON.parse(log.find(r => (r.method || '').toUpperCase() === 'POST' && r.url === API + '/issue').body);

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }
function assert(c, m) { if (!c) throw new Error(m); }
function inc(h, n, w) { assert(typeof h === 'string' && h.includes(n), (w || 'text') + ' sollte "' + n + '" enthalten, war: ' + JSON.stringify(h)); }
const BASIS = { action: 'create_issue', caller: 'web:florian', project: 'OM', summary: 'Billing', issuetype: 'Aufgabe' };

test('assignee "me" mit caller_name -> die fragende Person, nicht der unscharfe Treffer', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { assignee: 'me', caller_name: 'Florian Schumacher' }));
  assert(json.result, 'Ergebnis erwartet: ' + JSON.stringify(json));
  assert(postBody(log).fields.assignee.accountId === FLORIAN.accountId, 'Florian erwartet');
  assert(!log.some(r => decodeURIComponent(r.url).includes('query=me&')), '"me" darf nie als Suchbegriff an Jira gehen');
  inc(json.result, 'assignee: Florian Schumacher', 'Erfolgsmeldung');
  inc(json.result, 'type: Aufgabe');
});
test('assignee "ich" und "mir" ebenso', async () => {
  for (const w of ['ich', 'mir', 'myself']) {
    const { log } = await run(Object.assign({}, BASIS, { assignee: w, caller_name: 'Florian Schumacher' }));
    assert(postBody(log).fields.assignee.accountId === FLORIAN.accountId, w);
  }
});
test('assignee "me" ohne caller_name -> klarer Fehler, kein Ticket', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { assignee: 'me' }));
  assert(json.error, 'Fehler erwartet: ' + JSON.stringify(json));
  inc(json.error, 'meint die fragende Person');
  assert(!log.some(r => (r.method || '').toUpperCase() === 'POST' && r.url === API + '/issue'), 'kein POST');
});
test('unscharfer Einzeltreffer ("Schumi" -> Florian) wird nicht still genommen', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { assignee: 'Schumi' }));
  assert(json.error, 'Fehler erwartet: ' + JSON.stringify(json));
  inc(json.error, 'trifft nicht genau');
  inc(json.error, 'Meinst du Florian Schumacher');
  assert(!log.some(r => (r.method || '').toUpperCase() === 'POST' && r.url === API + '/issue'), 'kein POST');
});
test('exakter Name geht weiter durch', async () => {
  const { log } = await run(Object.assign({}, BASIS, { assignee: 'Florian Schumacher' }));
  assert(postBody(log).fields.assignee.accountId === FLORIAN.accountId);
});
test('zu kurze Suche wird abgewiesen', async () => {
  const { json } = await run(Object.assign({}, BASIS, { assignee: 'Fl' }));
  inc(json.error || '', 'zu kurz');
});
test('mehrdeutig bleibt mehrdeutig (Michael)', async () => {
  const { json } = await run(Object.assign({}, BASIS, { assignee: 'Michael' }));
  inc(json.error || '', 'Kandidaten: Michael Ammer');
});
test('update_issue assignee "me" mit caller_name', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', caller_name: 'Florian Schumacher', key: 'OM-1', assignee: 'me' });
  assert(json.result, JSON.stringify(json));
  const put = JSON.parse(log.find(r => (r.method || '').toUpperCase() === 'PUT').body);
  assert(put.fields.assignee.accountId === FLORIAN.accountId);
});
test('falscher Vorgangstyp -> Abbruch mit vollstaendiger Typliste und Ebenen, kein POST', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { issuetype: 'Task' }));
  assert(json.error, 'Fehler erwartet: ' + JSON.stringify(json));
  inc(json.error, 'Vorgangstyp "Task" gibt es im Projekt OM nicht');
  inc(json.error, 'Arbeitspaket (Ebene 1, kann Aufgaben enthalten)');
  inc(json.error, 'Aufgabe (Ebene 0)');
  inc(json.error, 'Unteraufgabe (Ebene -1, braucht parent)');
  assert(!log.some(r => (r.method || '').toUpperCase() === 'POST' && r.url === API + '/issue'), 'kein POST');
});
test('Typ in anderer Schreibweise wird kanonisch uebernommen', async () => {
  const { log } = await run(Object.assign({}, BASIS, { issuetype: 'aufgabe' }));
  assert(postBody(log).fields.issuetype.name === 'Aufgabe');
});
test('Unteraufgabe ohne parent -> Abbruch', async () => {
  const { json } = await run(Object.assign({}, BASIS, { issuetype: 'Unteraufgabe' }));
  inc(json.error || '', 'braucht ein uebergeordnetes Ticket');
});
test('parent als Objekt, als Adresse und als Schluessel', async () => {
  for (const p of [{ key: 'OM-5' }, 'https://test.atlassian.net/browse/OM-5', 'OM-5', '{"key":"OM-5"}']) {
    const { log, json } = await run(Object.assign({}, BASIS, { issuetype: 'Unteraufgabe', parent: p }));
    assert(json.result, 'Ergebnis fuer parent ' + JSON.stringify(p) + ': ' + JSON.stringify(json));
    assert(postBody(log).fields.parent.key === 'OM-5', 'parent ' + JSON.stringify(p));
    inc(json.result, 'parent: OM-5');
  }
});
test('Typliste nicht ladbar -> Anlegen laeuft ohne Pruefung weiter', async () => {
  const { json } = await run(Object.assign({}, BASIS, { issuetype: 'Task' }), { typenFehler: true });
  assert(json.result, JSON.stringify(json));
});
test('Fehlerpfad: Pflichtfelder nur fuer den genannten Typ, kein Rueckfall auf den ersten', async () => {
  const { json, log } = await run(Object.assign({}, BASIS, { issuetype: 'Aufgabe' }), { postFail: true });
  assert(json.error, JSON.stringify(json));
  inc(json.error, 'Typ "Aufgabe"');
  assert(!log.some(r => r.url === API + '/issue/createmeta/OM/issuetypes/10000'), 'Arbeitspaket (erster Typ) darf nicht geladen werden');
});
test('list_issue_types zeigt Ebenen und die Regel', async () => {
  const { json } = await run({ action: 'list_issue_types', caller: 'web:florian', project: 'OM' });
  inc(json.result, 'Arbeitspaket (Ebene 1, kann Aufgaben enthalten)');
  inc(json.result, 'Unteraufgabe (Ebene -1, braucht parent)');
  inc(json.result, 'Regel: Typ genau so uebernehmen');
});
test('ohne issuetype: der einzige Typ der Ebene 0 (Aufgabe), nicht "Task"', async () => {
  const { json, log } = await run({ action: 'create_issue', caller: 'web:florian', project: 'OM', summary: 'Ohne Typ' });
  assert(json.result, JSON.stringify(json));
  assert(postBody(log).fields.issuetype.name === 'Aufgabe', 'Aufgabe erwartet: ' + JSON.stringify(postBody(log).fields.issuetype));
});
test('update_issue nennt den Bearbeiter in der Erfolgsmeldung', async () => {
  const { json } = await run({ action: 'update_issue', caller: 'web:florian', caller_name: 'Florian Schumacher', key: 'OM-1', assignee: 'me' });
  inc(json.result, 'Bearbeiter: Florian Schumacher');
});
test('Erwaehnung @me in einem Kommentar wird zur fragenden Person, nicht zum unscharfen Treffer', async () => {
  const { json, log } = await run({ action: 'add_comment', caller: 'web:florian', caller_name: 'Florian Schumacher', key: 'OM-1', text: 'Bitte @me zuordnen' });
  const post = log.find(r => (r.method || '').toUpperCase() === 'POST' && /\/issue\/OM-1\/comment$/.test(r.url));
  assert(post, 'Kommentar-POST erwartet: ' + JSON.stringify(json));
  assert(post.body.includes(FLORIAN.accountId), 'Florian als Mention erwartet: ' + post.body.slice(0, 300));
  assert(!post.body.includes(MARTINA.accountId), 'Martina darf nicht erwaehnt werden');
});
test('Erwaehnung @Schumi (unscharfer Einzeltreffer) wird nicht still uebernommen', async () => {
  const { json } = await run({ action: 'add_comment', caller: 'web:florian', key: 'OM-1', text: 'Danke @Schumi' });
  inc(json.error || '', 'trifft nicht genau');
});
test('currentUser() mit Profilnamen, der Jira nur unscharf kennt (Mike -> Michael), geht weiter (vertrauter Pfad)', async () => {
  const { json, log } = await run({ action: 'search_issues', caller: 'web:mike', caller_name: 'Mike Ammer', jql: 'assignee = currentUser()', limit: '5' });
  const such = log.find(r => r.url.includes('/search/jql'));
  assert(such, 'Suche erwartet: ' + JSON.stringify(json));
  assert(decodeURIComponent(such.url).includes(MICHAEL_A.accountId), 'Michael Ammer erwartet: ' + decodeURIComponent(such.url).slice(0, 200));
});
test('Server: caller_name im Schema von create_issue und update_issue, Beschreibungen angepasst', async () => {
  for (const n of ['create_issue', 'update_issue']) {
    const s = wf.server.nodes.find(x => x.name === n);
    assert(s.parameters.workflowInputs.schema.some(x => x.id === 'caller_name'), n + ' caller_name im Schema');
    assert(/fromAI\('caller_name'/.test(s.parameters.workflowInputs.value.caller_name), n + ' caller_name value');
    inc(s.parameters.description, "'me' means the asking person", n + ' Beschreibung');
  }
  inc(wf.server.nodes.find(x => x.name === 'list_issue_types').parameters.description, 'hierarchy level');
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
