'use strict';
// Tests fuer den Code-Knoten "Jira Logic" aus workflow.json (v1.3.0).
// Aufruf: node templates/jira/test/jira-logic.test.js
// Keine Abhaengigkeiten: der jsCode wird als AsyncFunction mit gemocktem
// helpers.httpRequest ausgefuehrt, Eingaben kommen wie im Sub ueber
// $input.first().json.

const fs = require('fs');
const path = require('path');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const codeNode = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code');
const code = codeNode.parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);

const SITE = 'test.atlassian.net';
const API = 'https://' + SITE + '/rest/api/3';

// --- Mock-Daten ---
const FIELDS = [
  { id: 'summary', name: 'Zusammenfassung', custom: false, schema: { type: 'string', system: 'summary' } },
  { id: 'assignee', name: 'Zugewiesene Person', custom: false, schema: { type: 'user', system: 'assignee' } },
  { id: 'duedate', name: 'Fälligkeitsdatum', custom: false, schema: { type: 'date', system: 'duedate' } },
  { id: 'customfield_10098', name: 'Maßnahme', custom: true, schema: { type: 'array', items: 'option', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect', customId: 10098 } },
  { id: 'customfield_10015', name: 'Startdatum', custom: true, schema: { type: 'date', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker', customId: 10015 } },
  { id: 'customfield_10050', name: 'Verantwortlich', custom: true, schema: { type: 'user', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker', customId: 10050 } }
];
const SOPHIE = { accountId: '712020:0f6a-sophie', displayName: 'Sophie Strasser', emailAddress: 'sophie.strasser@example.com', accountType: 'atlassian' };
const MICHAEL_A = { accountId: '712020:aaaa-michael-a', displayName: 'Michael Ammer', emailAddress: 'michael.ammer@example.com', accountType: 'atlassian' };
const MICHAEL_B = { accountId: '712020:bbbb-michael-b', displayName: 'Michael Berger', emailAddress: 'michael.berger@example.com', accountType: 'atlassian' };

function issueOM1(withDue) {
  return {
    key: 'OM-1',
    fields: {
      summary: 'Kampagne Herbst',
      status: { name: 'In Progress' },
      issuetype: { name: 'Task' },
      assignee: SOPHIE,
      reporter: SOPHIE,
      priority: { name: 'Medium' },
      labels: ['marketing'],
      created: '2026-09-01T10:00:00.000+0200',
      updated: '2026-09-08T10:00:00.000+0200',
      duedate: withDue ? '2026-09-30' : null,
      description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Beschreibung' }] }] },
      comment: { comments: [] },
      issuelinks: [],
      parent: null,
      customfield_10098: [{ value: 'Meta' }],
      customfield_10015: null
    }
  };
}
const EDITMETA = {
  fields: {
    summary: { required: true, schema: { type: 'string', system: 'summary' }, name: 'Zusammenfassung' },
    duedate: { required: false, schema: { type: 'date', system: 'duedate' }, name: 'Fälligkeitsdatum' },
    customfield_10098: { required: false, schema: { type: 'array', items: 'option', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect', customId: 10098 }, name: 'Maßnahme', allowedValues: [{ value: 'Meta' }, { value: 'Adform' }] },
    customfield_10050: { required: false, schema: { type: 'user', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker', customId: 10050 }, name: 'Verantwortlich' }
  }
};

// --- Mock fuer helpers.httpRequest ---
function makeHelpers(opts) {
  opts = opts || {};
  const log = [];
  async function httpRequest(req) {
    log.push(req);
    const url = String(req.url);
    const dec = decodeURIComponent(url);
    const method = (req.method || 'GET').toUpperCase();
    if (url.includes('/rest/v1/template_credentials')) {
      return [
        { cred_key: 'atlassian_email', cred_value: 'bot@example.com' },
        { cred_key: 'atlassian_api_token', cred_value: 'token' },
        { cred_key: 'atlassian_site', cred_value: SITE }
      ];
    }
    if (url === API + '/field') {
      if (opts.fieldFail) throw new Error('boom');
      return FIELDS;
    }
    if (url.startsWith(API + '/user/search?')) {
      if (dec.includes('query=Sophie')) return [SOPHIE];
      if (dec.includes('query=Michael')) return [MICHAEL_A, MICHAEL_B];
      if (dec.includes('query=sophie.strasser@example.com')) return [SOPHIE];
      return [];
    }
    if (url.startsWith(API + '/issue/OM-1?fields=')) return issueOM1(opts.withDue);
    if (/\/issue\/OM-\d+\/editmeta$/.test(url)) return EDITMETA;
    if (url.startsWith(API + '/search/jql?')) {
      return { issues: [issueOM1(true), { key: 'OM-2', fields: { summary: 'Zweites Ticket', status: { name: 'To Do' }, issuetype: { name: 'Task' }, assignee: null, customfield_10098: null } }] };
    }
    if (method === 'PUT' && /\/issue\/OM-\d+$/.test(url)) {
      const key = url.split('/').pop();
      if (opts.putFail && opts.putFail(key)) {
        return { statusCode: 400, body: { errorMessages: [], errors: { customfield_10098: 'Field cannot be set. It is not on the appropriate screen, or unknown.' } } };
      }
      return { statusCode: 204, body: '' };
    }
    if (method === 'POST' && url === API + '/issue') return { statusCode: 201, body: { id: '10001', key: 'OM-9' } };
    if (url.startsWith(API + '/issue/createmeta/OM/issuetypes/1')) {
      return { fields: [{ fieldId: 'customfield_10098', name: 'Maßnahme', required: false, schema: { type: 'array', items: 'option' } }, { fieldId: 'duedate', name: 'Fälligkeitsdatum', schema: { type: 'date' } }] };
    }
    if (url.startsWith(API + '/issue/createmeta/OM/issuetypes')) return { issueTypes: [{ id: '1', name: 'Task' }] };
    throw new Error('unmocked request: ' + method + ' ' + url);
  }
  return { helpers: { httpRequest }, log };
}

async function run(input, opts) {
  const m = makeHelpers(opts);
  const out = await logic({ first: () => ({ json: input }) }, m.helpers);
  return { json: out[0].json, log: m.log };
}

function putBodies(log) {
  return log.filter(r => (r.method || '').toUpperCase() === 'PUT').map(r => JSON.parse(r.body));
}

// --- Testrahmen ---
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertIncludes(hay, needle, what) {
  assert(typeof hay === 'string' && hay.includes(needle), (what || 'text') + ' should contain "' + needle + '" but was: ' + JSON.stringify(hay));
}

test('list_fields listet Name | Id | Typ', async () => {
  const { json } = await run({ action: 'list_fields', caller: 'web:florian' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  assertIncludes(json.result, 'Maßnahme | customfield_10098 | array<option> (multiselect)');
  assertIncludes(json.result, 'Fälligkeitsdatum | duedate | date');
});

test('list_fields mit filter zeigt nur Treffer', async () => {
  const { json } = await run({ action: 'list_fields', caller: 'web:florian', filter: 'maß' });
  assertIncludes(json.result, 'Maßnahme | customfield_10098');
  assert(!json.result.includes('Startdatum'), 'filter should hide Startdatum');
});

test('get_issue mit fields "Maßnahme" zeigt "Maßnahme: Meta" und fragt customfield_10098 ab', async () => {
  const { json, log } = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Maßnahme' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  assertIncludes(json.result, 'Maßnahme: Meta');
  const req = log.find(r => r.url.startsWith(API + '/issue/OM-1?fields='));
  assertIncludes(req.url, 'customfield_10098', 'request url');
  assertIncludes(req.url, 'summary', 'request url keeps base fields');
});

test('get_issue: angefragtes Feld ohne Wert zeigt "(kein Wert)"', async () => {
  const { json } = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Startdatum, Fälligkeitsdatum' });
  assertIncludes(json.result, 'Startdatum: (kein Wert)');
  assertIncludes(json.result, 'Fälligkeitsdatum: (kein Wert)');
  assertIncludes(json.result, 'Maßnahme: Meta');
});

test('get_issue ohne fields zeigt Custom-Felder mit Wert und Due', async () => {
  const { json, log } = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1' }, { withDue: true });
  assertIncludes(json.result, 'Maßnahme: Meta');
  assertIncludes(json.result, 'Due: 2026-09-30');
  assert(!json.result.includes('Startdatum'), 'unrequested empty field must not appear');
  const req = log.find(r => r.url.startsWith(API + '/issue/OM-1?fields='));
  assert(!req.url.includes('*all'), 'default request must not use *all');
});

test('get_issue mit fields *all', async () => {
  const { json, log } = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: '*all' });
  const req = log.find(r => r.url.startsWith(API + '/issue/OM-1?fields='));
  assertIncludes(req.url, 'fields=*all', 'request url');
  assertIncludes(json.result, 'Maßnahme: Meta');
});

test('get_issue mit unbekanntem Feld -> Fehlertext mit list_fields', async () => {
  const { json } = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Gibtsnicht' });
  assert(json.error, 'expected error, got ' + JSON.stringify(json));
  assertIncludes(json.error, 'Gibtsnicht');
  assertIncludes(json.error, 'list_fields');
});

test('update_issue duedate + custom_fields Klarname -> PUT-Body', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', duedate: '2026-09-30', custom_fields: { 'Maßnahme': 'Meta' } });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  const bodies = putBodies(log);
  assert(bodies.length === 1, 'one PUT expected, got ' + bodies.length);
  assert(bodies[0].fields.duedate === '2026-09-30', 'duedate missing: ' + JSON.stringify(bodies[0]));
  assert(JSON.stringify(bodies[0].fields.customfield_10098) === JSON.stringify([{ value: 'Meta' }]), 'customfield_10098 shape: ' + JSON.stringify(bodies[0].fields.customfield_10098));
  assert(log.some(r => r.url.endsWith('/issue/OM-1/editmeta')), 'editmeta should be loaded');
});

test('update_issue custom_fields als JSON-String und Alias due_date', async () => {
  const { log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', due_date: '2026-10-01', custom_fields: '{"customfield_10098": ["Meta", "Adform"]}' });
  const b = putBodies(log)[0];
  assert(b.fields.duedate === '2026-10-01', 'due_date alias');
  assert(JSON.stringify(b.fields.customfield_10098) === JSON.stringify([{ value: 'Meta' }, { value: 'Adform' }]), 'list shape: ' + JSON.stringify(b.fields.customfield_10098));
});

test('update_issue duedate im falschen Format -> Fehlertext', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', duedate: '30.09.2026' });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'JJJJ-MM-TT');
  assert(putBodies(log).length === 0, 'no PUT on invalid date');
});

test('update_issue assignee "Sophie Strasser" -> accountId', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'Sophie Strasser' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  const b = putBodies(log)[0];
  assert(b.fields.assignee && b.fields.assignee.accountId === SOPHIE.accountId, 'assignee: ' + JSON.stringify(b.fields.assignee));
});

test('update_issue assignee accountId geht direkt durch', async () => {
  const { log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: '712020:0f6a-sophie' });
  assert(!log.some(r => r.url.includes('/user/search')), 'no user search for accountId');
  assert(putBodies(log)[0].fields.assignee.accountId === '712020:0f6a-sophie', 'accountId passthrough');
});

test('update_issue assignee "Michael" -> Kandidatenliste', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'Michael' });
  assert(json.error, 'expected error, got ' + JSON.stringify(json));
  assertIncludes(json.error, 'Michael Ammer (michael.ammer@example.com)');
  assertIncludes(json.error, 'Michael Berger (michael.berger@example.com)');
  assert(putBodies(log).length === 0, 'no PUT on ambiguous assignee');
});

test('update_issue assignee unbekannt -> Fehlertext', async () => {
  const { json } = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'Niemand Bekanntes' });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'list_users');
});

test('update_issue leerer assignee aendert nichts, "none" entfernt', async () => {
  const r1 = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', summary: 'Neu', assignee: '' });
  assert(!('assignee' in putBodies(r1.log)[0].fields), 'empty assignee must not unassign');
  const r2 = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'none' });
  assert(putBodies(r2.log)[0].fields.assignee === null, '"none" should unassign');
});

test('update_issue keys: Abbruch nach zweimal gleichem Fehler', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', keys: 'OM-1, OM-2, OM-3, OM-4', custom_fields: { 'Maßnahme': 'Meta' } }, { putFail: () => true });
  assert(json.error, 'expected error, got ' + JSON.stringify(json));
  assertIncludes(json.error, 'abgebrochen, gleicher Fehler zweimal');
  assertIncludes(json.error, 'customfield_10098: Field cannot be set');
  assert(putBodies(log).length === 2, 'exactly two PUTs before abort, got ' + putBodies(log).length);
  assertIncludes(json.error, '2 Ticket(s) nicht bearbeitet');
});

test('update_issue keys: Teilerfolg wird je Key gemeldet', async () => {
  const { json, log } = await run({ action: 'update_issue', caller: 'web:florian', keys: ['OM-1', 'OM-2', 'OM-3'], summary: 'Neu' }, { putFail: k => k === 'OM-2' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  assertIncludes(json.result, '2 of 3 issues updated');
  assertIncludes(json.result, 'OM-1: aktualisiert');
  assertIncludes(json.result, 'OM-2: Fehler HTTP 400');
  assertIncludes(json.result, 'OM-3: aktualisiert');
  assert(putBodies(log).length === 3, 'three PUTs');
});

test('search_issues mit currentUser() und caller_name -> accountId im JQL', async () => {
  const { json, log } = await run({ action: 'search_issues', caller: 'web:sophie', caller_name: 'Sophie Strasser', jql: 'assignee = currentUser() AND status != Done' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  const req = log.find(r => r.url.startsWith(API + '/search/jql?'));
  const dec = decodeURIComponent(req.url);
  assertIncludes(dec, 'assignee = "' + SOPHIE.accountId + '"', 'search url');
  assert(!dec.includes('currentUser()'), 'currentUser() must be replaced');
});

test('search_issues mit currentUser() ohne caller_name -> Hinweistext', async () => {
  const { json, log } = await run({ action: 'search_issues', caller: 'web:florian', jql: 'assignee = currentUser()' });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'Fuer currentUser() brauche ich den Jira-Nutzer der fragenden Person; nutze list_users mit der Mailadresse und setze die accountId ein.');
  assert(!log.some(r => r.url.startsWith(API + '/search/jql?')), 'no search without resolution');
});

test('search_issues mit currentUser() und mehrdeutigem caller_name -> Hinweistext', async () => {
  const { json } = await run({ action: 'search_issues', caller: 'web:michael', caller_name: 'Michael', jql: 'reporter = currentUser()' });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'Fuer currentUser() brauche ich');
});

test('search_issues: "Maßnahme" ~ "Adform" wird zu cf[10098]', async () => {
  const { log } = await run({ action: 'search_issues', caller: 'web:florian', jql: 'project = OM AND "Maßnahme" ~ "Adform" ORDER BY created DESC' });
  const req = log.find(r => r.url.startsWith(API + '/search/jql?'));
  const dec = decodeURIComponent(req.url);
  assertIncludes(dec, 'cf[10098] ~ "Adform"', 'search url');
  assert(!dec.includes('"Maßnahme"'), 'clear name must be replaced');
  assertIncludes(dec, 'ORDER BY created DESC', 'standard fields untouched');
});

test('search_issues: Standardfelder und Werte bleiben unveraendert', async () => {
  const { log } = await run({ action: 'search_issues', caller: 'web:florian', jql: 'assignee = "Sophie Strasser" AND Startdatum >= 2026-09-01 AND summary ~ "Maßnahme"' });
  const dec = decodeURIComponent(log.find(r => r.url.startsWith(API + '/search/jql?')).url);
  assertIncludes(dec, 'assignee = "Sophie Strasser"');
  assertIncludes(dec, 'cf[10015] >= 2026-09-01', 'unquoted clear name before operator');
  assertIncludes(dec, 'summary ~ "Maßnahme"', 'a value must not be rewritten');
});

test('search_issues mit fields "Maßnahme" haengt Werte je Ticket an', async () => {
  const { json, log } = await run({ action: 'search_issues', caller: 'web:florian', jql: 'project = OM', fields: 'Maßnahme' });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  assertIncludes(json.result, 'Maßnahme: Meta');
  assertIncludes(json.result, 'Maßnahme: (kein Wert)');
  const dec = decodeURIComponent(log.find(r => r.url.startsWith(API + '/search/jql?')).url);
  assertIncludes(dec, 'customfield_10098', 'fields param resolved');
  assertIncludes(dec, 'summary', 'default fields kept');
});

test('search_issues mit unbekanntem Feld -> Fehlertext', async () => {
  const { json } = await run({ action: 'search_issues', caller: 'web:florian', jql: 'project = OM', fields: 'Nixda' });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'list_fields');
});

test('create_issue mit duedate, Assignee per Name und custom_fields Klarname', async () => {
  const { json, log } = await run({ action: 'create_issue', caller: 'web:florian', project: 'OM', summary: 'Neues Ticket', duedate: '2026-10-15', assignee: 'Sophie Strasser', custom_fields: { 'Maßnahme': 'Adform' } });
  assert(json.result, 'expected result, got ' + JSON.stringify(json));
  assertIncludes(json.result, 'Issue created: OM-9');
  const post = log.find(r => (r.method || '').toUpperCase() === 'POST' && r.url === API + '/issue');
  const body = JSON.parse(post.body);
  assert(body.fields.duedate === '2026-10-15', 'duedate: ' + JSON.stringify(body.fields));
  assert(body.fields.assignee.accountId === SOPHIE.accountId, 'assignee: ' + JSON.stringify(body.fields.assignee));
  assert(JSON.stringify(body.fields.customfield_10098) === JSON.stringify([{ value: 'Adform' }]), 'custom field shape: ' + JSON.stringify(body.fields.customfield_10098));
});

test('create_issue mit unbekanntem custom_fields-Schluessel -> Fehlertext', async () => {
  const { json, log } = await run({ action: 'create_issue', caller: 'web:florian', project: 'OM', summary: 'X', custom_fields: { 'Unbekannt': 'Y' } });
  assert(json.error, 'expected error');
  assertIncludes(json.error, 'list_fields');
  assert(!log.some(r => (r.method || '').toUpperCase() === 'POST'), 'no POST on unknown field');
});

test('Feldliste nicht ladbar: Ids gehen weiter durch, Klarnamen melden sich', async () => {
  const r1 = await run({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', custom_fields: { customfield_10098: 'Meta' } }, { fieldFail: true });
  assert(r1.json.result, 'id should pass without index: ' + JSON.stringify(r1.json));
  const r2 = await run({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Maßnahme' }, { fieldFail: true });
  assert(r2.json.error, 'clear name without index should fail');
  assertIncludes(r2.json.error, 'Feldliste');
});

test('Schemas im Server: alle Tools kennen action und caller, neue Parameter vorhanden', async () => {
  const tools = wf.server.nodes.filter(n => n.type.endsWith('toolWorkflow'));
  const byName = {};
  for (const t of tools) {
    const wi = t.parameters.workflowInputs;
    const ids = wi.schema.map(s => s.id);
    assert(ids.includes('action') && ids.includes('caller'), t.name + ' lacks action/caller');
    assert(JSON.stringify(ids) === JSON.stringify(Object.keys(wi.value)), t.name + ' schema/value mismatch');
    assert(!/[{}]/.test(t.parameters.description), t.name + ' description contains braces');
    assert(wf.server.connections[t.name], t.name + ' not connected');
    byName[t.name] = ids;
  }
  assert(byName.list_fields && byName.list_fields.includes('filter'), 'list_fields filter');
  assert(byName.get_issue.includes('fields'), 'get_issue fields');
  assert(byName.search_issues.includes('caller_name') && byName.search_issues.includes('fields'), 'search_issues caller_name/fields');
  for (const p of ['keys', 'duedate', 'custom_fields']) assert(byName.update_issue.includes(p), 'update_issue ' + p);
  assert(byName.create_issue.includes('duedate'), 'create_issue duedate');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
  const mtools = manifest.tools.map(t => t.name).sort();
  assert(JSON.stringify(mtools) === JSON.stringify(Object.keys(byName).sort()), 'manifest tools differ from server nodes: ' + mtools.join(',') + ' vs ' + Object.keys(byName).sort().join(','));
});

(async () => {
  let passed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      passed++;
      console.log('ok   ' + c.name);
    } catch (e) {
      console.log('FAIL ' + c.name + '\n     ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n     ') : e));
    }
  }
  console.log('\n' + passed + ' von ' + cases.length + ' Faellen bestanden');
  process.exit(passed === cases.length ? 0 : 1);
})();
