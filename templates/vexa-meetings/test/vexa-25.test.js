'use strict';
// Tests fuer Vexa Meetings 2.5.0 mit dem echten Knotencode und gefaelschten
// HTTP-Aufrufen. Die Attrappen bilden nach, was am 18.09.2026 auf einem echten
// Konto gemessen wurde: leeres Prepaid-Guthaben beendet laufende Bots nach
// wenigen Minuten und laesst POST /bots mit 403 scheitern, und der Grund steht
// woertlich in data.service_authority jeder Antwort von GET /meetings.
// Aufruf: node templates/vexa-meetings/test/vexa-25.test.js
const fs = require('fs');
const path = require('path');
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.sub.nodes.find(n => n.type === 'n8n-nodes-base.code').parameters.jsCode;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logic = new AsyncFunction('$input', 'helpers', code);
const API = 'https://api.cloud.vexa.ai';

const LEER = {
  mode: 'enforce', allow: false, reason: 'insufficient_balance',
  message: 'This account is out of prepaid credit, so the bot cannot join. Top up at https://vexa.ai/account and it joins straight away.',
  decided_at: new Date(Date.now() - 3600 * 1000).toISOString()
};
const OK = { mode: 'enforce', allow: true, reason: 'allowed', decided_at: new Date(Date.now() - 3600 * 1000).toISOString() };

function meeting(id, opts) {
  opts = opts || {};
  return {
    id: id, platform: 'teams', native_meeting_id: opts.raum || '327920174785225',
    status: opts.status || 'completed',
    start_time: opts.start || '2026-09-17T07:04:10.000000Z',
    end_time: opts.ende === null ? null : (opts.ende || '2026-09-17T07:23:12.000000Z'),
    created_at: opts.start || '2026-09-17T07:04:10.000000Z',
    data: {
      reason: opts.grund || 'stopped (workload destroyed, confirmed by runtime)',
      completion_reason: opts.abschluss || 'stopped',
      segments_captured: opts.segs === undefined ? 68 : opts.segs,
      service_authority: opts.autoritaet === undefined ? LEER : opts.autoritaet
    }
  };
}
function segmente(n, ab, wer) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ start: i * 5, end: i * 5 + 4, text: 'Satz ' + (i + 1) + ' aus ' + (wer || 'Lauf'),
      speaker: wer || 'Hannah Traussnigg',
      absolute_start_time: new Date(Date.parse(ab) + i * 5000).toISOString() });
  }
  return out;
}

function makeHelpers(opts) {
  opts = opts || {};
  const log = [];
  async function httpRequest(req) {
    const url = String(req.url);
    const method = (req.method || 'GET').toUpperCase();
    log.push({ method: method, url: url, body: req.body });
    if (url.includes('/rest/v1/template_credentials')) {
      return [
        { cred_key: 'vexa_api_key', cred_value: 'vxa_bot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        { cred_key: 'vexa_tx_key', cred_value: 'vxa_tx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        { cred_key: 'vexa_bot_name', cred_value: 'Rupert' },
        { cred_key: 'vexa_language', cred_value: 'de' },
        { cred_key: 'vexa_timezone', cred_value: 'Europe/Vienna' }
      ];
    }
    if (url === API + '/meetings') return { meetings: opts.meetings || [] };
    if (url === API + '/bots/status') {
      if (opts.statusFehler) throw new Error('Request failed with status code ' + opts.statusFehler);
      return { running: opts.laufende || [], running_bots: opts.laufende || [], count: (opts.laufende || []).length };
    }
    if (method === 'POST' && url === API + '/bots') {
      if (opts.deployFehler) throw new Error('Request failed with status code ' + opts.deployFehler);
      return { id: 28999, status: 'requested', constructed_meeting_url: 'https://teams.microsoft.com/meet/327920174785225?p=X' };
    }
    if (url.indexOf(API + '/transcripts/by-id/') === 0) {
      const id = url.substring((API + '/transcripts/by-id/').length);
      const t = (opts.transkripte || {})[id];
      if (!t) throw new Error('Request failed with status code 404');
      return t;
    }
    if (url.indexOf(API + '/transcripts/') === 0) {
      if (!opts.neuster) throw new Error('Request failed with status code 404');
      return opts.neuster;
    }
    if (method === 'DELETE') {
      if (opts.stopFehler) throw new Error('Request failed with status code ' + opts.stopFehler);
      return {};
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

let n = 0, f = 0;
function pruefe(name, ok, info) {
  n++; if (!ok) f++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(info).slice(0, 400)));
}
const URL_MIT = 'https://teams.microsoft.com/meet/327920174785225?p=5P7JYH2IrBBniNsDrk';
const URL_OHNE = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZTNj%40thread.v2/0?context=%7b%22Tid%22%3a%2277bb%22%7d';

(async () => {
  console.log('--- Leeres Guthaben wird als das benannt, was es ist ---');
  // Der Befund ERKLAERT den Fehler, er verhindert den Versuch nicht: sonst waere
  // ein frisch aufgeladenes Konto so lange gesperrt, bis jemand einen Bot startet.
  let r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT },
    { meetings: [meeting(28688)], deployFehler: 403 });
  pruefe('403 bei leerem Konto wird als Guthaben erklaert', /prepaid credit on the Vexa account is used up/.test(r.json.error), r.json);
  pruefe('deploy sagt ausdruecklich: kein Schluesselproblem', /NOT a wrong API key/.test(r.json.error), r.json.error);
  pruefe('deploy nennt den Betreiber als den, der handeln muss', /operator of this assistant can top the account up/.test(r.json.error), r.json.error);
  pruefe('Vexa-Wortlaut steht drin', /out of prepaid credit/.test(r.json.error), r.json.error);

  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT }, { meetings: [meeting(28688)] });
  pruefe('frisch aufgeladen: der Versuch laeuft trotz altem Befund',
    /Bot deployed successfully/.test(r.json.result || ''), r.json);
  pruefe('und der Bot wird wirklich geschickt', r.log.some(x => x.method === 'POST' && /\/bots$/.test(x.url)), r.log.map(x => x.method + ' ' + x.url));

  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT },
    { meetings: [meeting(28688, { autoritaet: OK })], deployFehler: 403 });
  pruefe('403 ohne Guthabenbefund bleibt der Schluesselhinweis', /insufficient scope/.test(r.json.error) && /vxa_bot_/.test(r.json.error), r.json.error);

  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT },
    { meetings: [meeting(28688, { autoritaet: Object.assign({}, LEER, { decided_at: '2026-08-01T10:00:00Z' }) })], deployFehler: 403 });
  pruefe('alter Guthabenbefund (6 Wochen) wird nicht mehr als Grund genannt', !/prepaid credit/.test(r.json.error), r.json);

  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT }, { meetings: [] });
  pruefe('ohne Befund laeuft der Deploy normal', /Bot deployed successfully/.test(r.json.result || ''), r.json);
  pruefe('Lauf-Id wird genannt', /Vexa run ID 28999/.test(r.json.result || ''), r.json.result);

  console.log('--- Warum ist er ausgestiegen ---');
  r = await run({ action: 'list_bots' }, { meetings: [meeting(28688)] });
  pruefe('list_bots nennt das Guthaben statt "keine Bots"', /prepaid credit/.test(r.json.result), r.json.result);
  pruefe('list_bots nennt den letzten Lauf', /Vexa run 28688/.test(r.json.result), r.json.result);
  r = await run({ action: 'list_bots' }, { meetings: [meeting(28688, { autoritaet: OK, grund: 'stopped by user', abschluss: 'stopped' })] });
  pruefe('ohne Guthabenproblem bleibt der alte Hinweistext', /CAUTION/.test(r.json.result), r.json.result);
  pruefe('Endegrund des letzten Laufs steht dabei', /End reason: stopped/.test(r.json.result), r.json.result);
  r = await run({ action: 'list_bots' }, { meetings: [], laufende: [{ platform: 'teams', native_meeting_id: '327920174785225', status: 'active', created_at: '2026-09-18T08:00:00Z' }] });
  pruefe('laufender Bot wird weiter normal gemeldet', /Running bots \(1\)/.test(r.json.result), r.json.result);

  console.log('--- Mehrere Laeufe eines Meetings zusammenfuegen (Hannah 17.09.) ---');
  // Vier Laeufe wie am 17.09.2026: 09:04, 09:26, 09:52, 10:18 Wiener Zeit.
  const LAEUFE = [
    meeting(28672, { start: '2026-09-17T07:04:10.000Z', ende: '2026-09-17T07:23:12.000Z' }),
    meeting(28675, { start: '2026-09-17T07:26:59.000Z', ende: '2026-09-17T07:46:03.000Z' }),
    meeting(28684, { start: '2026-09-17T07:52:31.000Z', ende: '2026-09-17T08:11:37.000Z' }),
    meeting(28688, { start: '2026-09-17T08:18:55.000Z', ende: '2026-09-17T08:38:00.000Z' })
  ];
  const TRANS = {
    '28672': { id: 28672, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T07:04:10.000Z', end_time: '2026-09-17T07:23:12.000Z', segments: segmente(3, '2026-09-17T07:04:10.000Z', 'Hannah Traussnigg') },
    '28675': { id: 28675, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T07:26:59.000Z', end_time: '2026-09-17T07:46:03.000Z', segments: segmente(3, '2026-09-17T07:26:59.000Z', 'Rainer Edlinger') },
    '28684': { id: 28684, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T07:52:31.000Z', end_time: '2026-09-17T08:11:37.000Z', segments: segmente(3, '2026-09-17T07:52:31.000Z', 'Hannah Traussnigg') },
    '28688': { id: 28688, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T08:18:55.000Z', end_time: '2026-09-17T08:38:00.000Z', segments: segmente(3, '2026-09-17T08:18:55.000Z', 'Sophie Strasser') }
  };
  const OPTS = { meetings: LAEUFE, neuster: TRANS['28688'], transkripte: TRANS };
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT }, OPTS);
  pruefe('alle vier Laeufe stehen im Ergebnis', /4 separate recording runs/.test(r.json.result), (r.json.result || '').slice(0, 300));
  for (const id of ['28672', '28675', '28684', '28688']) {
    pruefe('Lauf ' + id + ' ist enthalten', r.json.result.indexOf('Vexa run ID ' + id) >= 0, null);
  }
  pruefe('alle zwoelf Saetze sind da', (r.json.result.match(/Satz /g) || []).length === 12, (r.json.result.match(/Satz /g) || []).length);
  // Die echten Abstaende vom 17.09.2026: 3:47, 6:28 und 7:18 Minuten.
  pruefe('alle drei Luecken werden benannt',
    /GAP of about 4 minutes/.test(r.json.result) && /GAP of about 6 minutes/.test(r.json.result) && /GAP of about 7 minutes/.test(r.json.result),
    (r.json.result.match(/GAP[^\n]*/g) || []));
  pruefe('Warnung, es nicht als eine Aufnahme auszugeben', /Do not present this as one uninterrupted recording/.test(r.json.result), null);
  pruefe('Sprecher der einzelnen Laeufe bleiben getrennt',
    /Rainer Edlinger/.test(r.json.result) && /Sophie Strasser/.test(r.json.result), null);
  pruefe('Bloecke werden nicht ueber Laufgrenzen zusammengeklebt',
    (r.json.result.match(/Hannah Traussnigg:/g) || []).length >= 2, (r.json.result.match(/Hannah Traussnigg:/g) || []).length);

  r = await run({ action: 'get_transcript', meeting_url: URL_MIT, all_runs: 'false' }, OPTS);
  pruefe('all_runs=false liefert nur den letzten Lauf', !/separate recording runs/.test(r.json.result) && (r.json.result.match(/Satz /g) || []).length === 3, (r.json.result || '').slice(0, 200));
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT, vexa_run_id: '28675' }, OPTS);
  pruefe('mit Lauf-Id genau dieser Lauf', /Vexa run ID: 28675/.test(r.json.result) && (r.json.result.match(/Satz /g) || []).length === 3, (r.json.result || '').slice(0, 200));

  // Ein Lauf am Vortag darf nicht mit hineingezogen werden.
  const MIT_VORTAG = OPTS.meetings.concat([meeting(28500, { start: '2026-09-16T07:12:15.000Z', ende: '2026-09-16T07:31:21.000Z' })]);
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT }, Object.assign({}, OPTS, { meetings: MIT_VORTAG }));
  pruefe('Laeufe anderer Tage bleiben draussen', /4 separate recording runs/.test(r.json.result) && !/28500/.test(r.json.result), (r.json.result || '').slice(0, 200));

  r = await run({ action: 'get_transcript', meeting_url: URL_MIT },
    Object.assign({}, OPTS, { transkripte: { '28688': TRANS['28688'] } }));
  pruefe('nicht abrufbarer Lauf wird benannt, nicht verschwiegen', /COULD NOT BE FETCHED/.test(r.json.result), (r.json.result || '').slice(0, 400));

  console.log('--- Zusammengefuegt wird nach Abstand, nicht nach Kalendertag ---');
  // Ein Teams-Raum einer wiederkehrenden Besprechung traegt immer dieselbe
  // Meeting-Id. Zwei Termine am selben Tag duerfen deshalb NICHT zu einem
  // Protokoll verschmelzen.
  const NACHMITTAG = meeting(28700, { start: '2026-09-17T12:00:00.000Z', ende: '2026-09-17T12:45:00.000Z' });
  const TRANS2 = Object.assign({}, TRANS, {
    '28700': { id: 28700, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed',
               start_time: '2026-09-17T12:00:00.000Z', end_time: '2026-09-17T12:45:00.000Z',
               segments: segmente(2, '2026-09-17T12:00:00.000Z', 'Carmen Kurcz') }
  });
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT },
    { meetings: LAEUFE.concat([NACHMITTAG]), neuster: TRANS['28688'], transkripte: TRANS2 });
  pruefe('die vier Abschnitte am Vormittag gehoeren zusammen', /4 separate recording runs/.test(r.json.result), (r.json.result || '').slice(0, 200));
  pruefe('der Nachmittagstermin bleibt draussen', !/28700/.test(r.json.result) && !/Carmen Kurcz/.test(r.json.result), (r.json.result || '').slice(0, 300));
  pruefe('die Abstandsregel steht in der Antwort', /further apart than 45 minutes/.test(r.json.result), null);

  r = await run({ action: 'get_transcript', meeting_url: URL_MIT },
    { meetings: [NACHMITTAG].concat(LAEUFE), neuster: TRANS2['28700'], transkripte: TRANS2 });
  pruefe('fragt man den Nachmittagstermin ab, kommt nur er', !/separate recording runs/.test(r.json.result) && /Carmen Kurcz/.test(r.json.result), (r.json.result || '').slice(0, 200));

  // Der gerade abgefragte Lauf fehlt in der Liste oder hat noch kein start_time.
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT },
    { meetings: LAEUFE.slice(0, 3), neuster: TRANS['28688'], transkripte: TRANS });
  pruefe('der abgefragte Lauf ist auch ohne Listeneintrag dabei', (r.json.result.match(/Satz /g) || []).length === 12, (r.json.result.match(/Satz /g) || []).length);

  // Laeuft die Besprechung ueber Mitternacht, zaehlt weiter der Abstand.
  const NACHT = [
    meeting(28801, { start: '2026-09-17T21:50:00.000Z', ende: '2026-09-17T22:05:00.000Z' }),
    meeting(28802, { start: '2026-09-17T22:10:00.000Z', ende: '2026-09-17T22:30:00.000Z' })
  ];
  const TRANS_N = {
    '28801': { id: 28801, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T21:50:00.000Z', end_time: '2026-09-17T22:05:00.000Z', segments: segmente(2, '2026-09-17T21:50:00.000Z', 'Hannah Traussnigg') },
    '28802': { id: 28802, platform: 'teams', native_meeting_id: '327920174785225', status: 'completed', start_time: '2026-09-17T22:10:00.000Z', end_time: '2026-09-17T22:30:00.000Z', segments: segmente(2, '2026-09-17T22:10:00.000Z', 'Rainer Edlinger') }
  };
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT }, { meetings: NACHT, neuster: TRANS_N['28802'], transkripte: TRANS_N });
  pruefe('ueber Mitternacht (Wiener Zeit) bleiben die Abschnitte zusammen', /2 separate recording runs/.test(r.json.result), (r.json.result || '').slice(0, 200));

  console.log('--- Endegrund im Transkript ---');
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT, all_runs: 'false' },
    { meetings: [meeting(28688, { start: '2026-09-17T08:18:55.000Z' })], neuster: TRANS['28688'], transkripte: TRANS });
  pruefe('Transkript nennt den Grund des Endes', /Vexa blocked this account at the time: insufficient_balance/.test(r.json.result), (r.json.result || '').slice(0, 400));
  r = await run({ action: 'get_transcript', meeting_url: URL_MIT, all_runs: 'false' },
    { meetings: [meeting(28688, { start: '2026-09-17T08:18:55.000Z' })], neuster: Object.assign({}, TRANS['28688'], { segments: [] }), transkripte: {} });
  pruefe('auch ohne Segmente steht der Grund da', /insufficient_balance/.test(r.json.result), (r.json.result || '').slice(0, 300));

  console.log('--- check_meeting_url ---');
  r = await run({ action: 'check_meeting_url', meeting_url: URL_MIT }, {});
  pruefe('vollstaendiger Teams-Link ist brauchbar', /^USABLE/.test(r.json.result) && /with passcode/.test(r.json.result), r.json);
  pruefe('check schickt keinen Bot los (nur die Kontoabfrage)',
    !r.log.some(x => x.method === 'POST' && /\/bots$/.test(x.url)), r.log.map(x => x.method + ' ' + x.url));
  r = await run({ action: 'check_meeting_url', meeting_url: URL_OHNE }, {});
  pruefe('Teams-Link ohne Passcode wird vorher erkannt', /^NOT USABLE/.test(r.json.result) && /passcode/.test(r.json.result), r.json);
  r = await run({ action: 'check_meeting_url', meeting_url: 'Hier klicken, um an der Besprechung teilzunehmen' }, {});
  pruefe('Text statt Link: klare Ansage', /^NOT USABLE/.test(r.json.result) && /real join link/.test(r.json.result), r.json);
  r = await run({ action: 'check_meeting_url', meeting_url: 'https://meet.google.com/abc-defg-hij' }, {});
  pruefe('Google Meet ohne Passcode ist brauchbar', /^USABLE/.test(r.json.result), r.json);
  r = await run({ action: 'check_meeting_url' }, {});
  pruefe('ohne Link: Meldung', /meeting_url" is required/.test(r.json.error), r.json);

  console.log('--- Regression ---');
  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_OHNE }, { meetings: [] });
  pruefe('Teams ohne Passcode wird weiter abgelehnt', /without a passcode/.test(r.json.error), r.json);
  r = await run({ action: 'deploy_meeting_bot', meeting_url: URL_MIT },
    { meetings: [meeting(28999, { status: 'active', ende: null, start: new Date(Date.now() - 300000).toISOString(), autoritaet: OK })] });
  pruefe('laufender Bot verhindert den zweiten', /ALREADY in this meeting/.test(r.json.error), r.json);
  pruefe('Doppelanfrage wird erklaert', /One bot serves everybody in the room/.test(r.json.error), r.json.error);
  r = await run({ action: 'stop_bot', meeting_url: URL_MIT }, { meetings: [], stopFehler: 404 });
  pruefe('stop_bot 404 bleibt eindeutig', /did NOT go through/.test(r.json.error), r.json);
  r = await run({ action: 'quatsch' }, {});
  pruefe('unbekannte Aktion nennt check_meeting_url', /check_meeting_url/.test(r.json.error), r.json);

  console.log('\n' + (n - f) + ' von ' + n + ' Faellen bestanden');
  process.exit(f ? 1 : 0);
})();
