// Zusatzfaelle aus dem Review vom 09.09.2026 zum Jira-Skill 1.3.0.
// Prueft mit dem echten Knotencode: Umlaut-Normalisierung, JQL nur ausserhalb von
// Anfuehrungszeichen, Kuerzung langer Feldwerte, Zahlen, Leeren per null,
// Abbruchregel bei mehreren Tickets, Jira-Spezialwerte, accountId-Erkennung.
//   node templates/jira/test/jira-review.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const FELDER = [
  { id: 'summary', name: 'Summary', schema: { type: 'string' } },
  { id: 'duedate', name: 'Fälligkeitsdatum', schema: { type: 'date' } },
  { id: 'customfield_10098', name: 'Maßnahme', schema: { type: 'array', items: 'option', custom: 'multiselect' } },
  { id: 'customfield_10030', name: 'Budget', schema: { type: 'number', custom: 'float' } },
  { id: 'customfield_10015', name: 'Startdatum', schema: { type: 'date', custom: 'datepicker' } },
];
const EDITMETA = {
  fields: {
    customfield_10098: { schema: { type: 'array', items: 'option' } },
    customfield_10030: { schema: { type: 'number' } },
  },
};
function lang(n) { return 'x'.repeat(n); }

async function lauf(input, opts = {}) {
  const log = [];
  const helpers = { httpRequest: async (req) => {
    const url = String(req.url); const m = req.method || 'GET';
    let body = null; try { body = req.body ? JSON.parse(req.body) : null; } catch (_e) { body = req.body; }
    log.push({ m, url, body });
    if (url.includes('/rest/v1/template_credentials')) return [
      { cred_key: 'atlassian_email', cred_value: 'bot@example.com' },
      { cred_key: 'atlassian_api_token', cred_value: 'token' },
      { cred_key: 'atlassian_site', cred_value: 'test.atlassian.net' }];
    if (url.endsWith('/field')) return opts.felder === null ? (() => { throw new Error('keine Feldliste'); })() : (opts.felder || FELDER);
    if (url.includes('/user/search')) {
      const q = decodeURIComponent(url.split('query=')[1] || '').split('&')[0];
      if (/sophie/i.test(q)) return [{ accountId: '557058:aaaa', displayName: 'Sophie Strasser', emailAddress: 's.strasser@x.at' }];
      if (/maximilian/i.test(q)) return [{ accountId: '557058:bbbb', displayName: 'Maximilian-Alexander Huber' }];
      return [];
    }
    if (url.includes('/editmeta')) return EDITMETA;
    if (url.includes('/search')) return { issues: opts.issues || [], total: (opts.issues || []).length };
    if (m === 'GET' && /\/issue\/[^/]+\?/.test(url)) return { key: 'OM-1', fields: Object.assign({ summary: 'S', status: { name: 'Offen' }, issuetype: { name: 'Task' } }, opts.fields || {}) };
    if (m === 'PUT') {
      const key = decodeURIComponent(url.split('/issue/')[1] || '');
      const st = (opts.putStatus || {})[key];
      if (st) { const e = new Error('http'); e.response = { statusCode: st, body: { errorMessages: [st === 404 ? 'Issue does not exist or you do not have permission to see it.' : 'Feld ungueltig'] } }; throw e; }
      return { statusCode: 204, body: '' };
    }
    return {};
  } };
  const $input = { first: () => ({ json: input }) };
  const fn = new AsyncFunction('$input', 'helpers', code);
  const out = await fn($input, helpers);
  return { json: out[0].json, log };
}
const puts = log => log.filter(r => r.m === 'PUT').map(r => r.body);
const gets = log => log.filter(r => r.m === 'GET').map(r => r.url);

let n = 0, fehler = 0;
async function fall(name, fn) {
  n++;
  try { await fn(); console.log('PASS', name); }
  catch (e) { fehler++; console.log('FAIL', name, '|', String(e.message).slice(0, 220)); }
}

(async () => {
  await fall('Umlaut: "Massnahme" trifft das Feld "Maßnahme"', async () => {
    const r = await lauf({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Massnahme' },
      { fields: { customfield_10098: [{ value: 'Meta' }] } });
    assert.ok(!r.json.error, r.json.error);
    assert.match(r.json.result, /Maßnahme: Meta/);
    assert.ok(gets(r.log).some(u => u.includes('customfield_10098')), 'Feld wurde angefragt');
  });

  await fall('JQL: Feldname in Anfuehrungszeichen wird ersetzt', async () => {
    const r = await lauf({ action: 'search_issues', caller: 'web:florian', jql: '"Maßnahme" = "Adform"' });
    const u = gets(r.log).find(x => /\/rest\/api\/3\/search/.test(x));
    assert.match(decodeURIComponent(u), /cf\[10098\] = "Adform"/);
  });

  await fall('JQL: derselbe Text als Suchwert bleibt unangetastet', async () => {
    const r = await lauf({ action: 'search_issues', caller: 'web:florian', jql: 'summary ~ "Maßnahme in Arbeit"' });
    const u = decodeURIComponent(gets(r.log).find(x => /\/rest\/api\/3\/search/.test(x)));
    assert.match(u, /summary ~ "Maßnahme in Arbeit"/);
    assert.doesNotMatch(u, /cf\[/);
  });

  await fall('JQL: currentUser() in einem Suchwert wird nicht ersetzt', async () => {
    const r = await lauf({ action: 'search_issues', caller: 'web:florian', caller_name: 'Sophie Strasser', jql: 'summary ~ "currentUser() Doku" AND assignee = currentUser()' });
    const u = decodeURIComponent(gets(r.log).find(x => /\/rest\/api\/3\/search/.test(x)));
    assert.match(u, /summary ~ "currentUser\(\) Doku"/);
    assert.match(u, /assignee = "557058:aaaa"/);
  });

  await fall('lange Feldwerte werden gekuerzt', async () => {
    const r = await lauf({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: 'Maßnahme' },
      { fields: { customfield_10098: lang(2000), description: { type: 'doc', content: [] } } });
    const zeile = r.json.result.split('\n').find(l => l.trim().startsWith('Maßnahme:')) || '';
    assert.ok(zeile.length < 400, 'Zeilenlaenge ' + zeile.length);
    assert.match(zeile, /\.\.\.$/);
  });

  await fall('Zahlenfeld bleibt eine Zahl', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', custom_fields: JSON.stringify({ Budget: 1500 }) });
    assert.equal(puts(r.log)[0].fields.customfield_10030, 1500);
  });

  await fall('null leert ein Listenfeld', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', custom_fields: JSON.stringify({ 'Maßnahme': null }) });
    assert.equal(puts(r.log)[0].fields.customfield_10098, null);
  });

  await fall('Mehrfach-Update: 404 bricht die uebrigen nicht ab', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', keys: 'OM-1,OM-2,OM-3,OM-4', summary: 'Neu' },
      { putStatus: { 'OM-1': 404, 'OM-3': 404 } });
    assert.equal(puts(r.log).length, 4, 'alle vier versucht');
    assert.match(r.json.result || r.json.error, /2 of 4/);
    assert.doesNotMatch(r.json.result || r.json.error, /abgebrochen/);
  });

  await fall('Mehrfach-Update: zweimal derselbe echte Fehler bricht ab', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', keys: 'OM-1,OM-2,OM-3', summary: 'Neu' },
      { putStatus: { 'OM-1': 400, 'OM-2': 400 } });
    assert.match(r.json.result || r.json.error, /abgebrochen, gleicher Fehler zweimal/);
    assert.equal(puts(r.log).length, 2, 'nach dem zweiten Fehler Schluss');
  });

  await fall('Mehrfach-Update: Erfolg dazwischen setzt den Zaehler zurueck', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', keys: 'OM-1,OM-2,OM-3', summary: 'Neu' },
      { putStatus: { 'OM-1': 400, 'OM-3': 400 } });
    assert.equal(puts(r.log).length, 3, 'alle drei versucht');
    assert.doesNotMatch(r.json.result || r.json.error, /abgebrochen/);
  });

  await fall('Jira-Spezialwert *navigable geht durch', async () => {
    const r = await lauf({ action: 'get_issue', caller: 'web:florian', key: 'OM-1', fields: '*navigable' });
    assert.ok(!r.json.error, r.json.error);
    assert.ok(gets(r.log).some(u => u.includes('*navigable')));
  });

  await fall('Name ohne Leerzeichen gilt nicht als accountId', async () => {
    const r = await lauf({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'Maximilian-Alexander' });
    assert.ok(r.log.some(x => x.url.includes('/user/search')), 'Nutzersuche gelaufen');
    // Seit 1.4.0 (10.09.2026) wird ein unscharfer Einzeltreffer nicht mehr still
    // uebernommen ("me" wurde Martina Rechner-Meilinger): der Kandidat wird genannt,
    // die Zuweisung braucht den vollen Namen.
    assert.equal(puts(r.log).length, 0, 'kein PUT ohne exakten Treffer');
    assert.match(r.json.error, /Meinst du Maximilian-Alexander Huber/);
    const r2 = await lauf({ action: 'update_issue', caller: 'web:florian', key: 'OM-1', assignee: 'Maximilian-Alexander Huber' });
    assert.equal(puts(r2.log)[0].fields.assignee.accountId, '557058:bbbb');
  });

  await fall('ohne fields kommen Custom-Felder mit Wert automatisch mit', async () => {
    const r = await lauf({ action: 'get_issue', caller: 'web:florian', key: 'OM-1' },
      { fields: { customfield_10098: [{ value: 'Meta' }] } });
    assert.ok(!r.json.error, r.json.error);
    assert.ok(gets(r.log).some(u => u.includes('*navigable')), 'Standardabruf fragt *navigable mit ab');
    assert.match(r.json.result, /Maßnahme: Meta/);
  });

  console.log('');
  console.log((n - fehler) + ' von ' + n + ' Faellen bestanden');
  process.exit(fehler ? 1 : 0);
})();
