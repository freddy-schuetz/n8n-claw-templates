const input = $input.first().json;
const action = input.action || '';

const SUPABASE_URL = '{{SUPABASE_URL}}';
const SUPABASE_KEY = '{{SUPABASE_SERVICE_KEY}}';
const pgHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

const allCreds = await helpers.httpRequest({
  method: 'GET',
  url: SUPABASE_URL + '/rest/v1/template_credentials?template_id=eq.zoho-crm&select=cred_key,cred_value',
  headers: pgHeaders
});
const creds = {};
for (const c of (allCreds || [])) creds[c.cred_key] = c.cred_value;
if (!creds.zoho_client_id || !creds.zoho_client_secret) {
  return [{ json: { error: 'Zoho credentials missing: zoho_client_id and zoho_client_secret are required. Register a Self-Client at https://api-console.zoho.{region}/ and re-add credentials.' } }];
}
if (!creds.zoho_refresh_token && !creds.zoho_grant_code) {
  return [{ json: { error: 'Zoho credentials missing: provide either zoho_grant_code (one-time, 10-min TTL from Self-Client "Generate Code" tab) or zoho_refresh_token. Use add_credential to enter the grant code.' } }];
}

const REGION = String(creds.zoho_region || 'eu').trim().replace(/^\./, '');
const ACCOUNTS = 'https://accounts.zoho.' + REGION;
const API = 'https://www.zohoapis.' + REGION + '/crm/v8';

function truncate(text, max) {
  max = max || 6000;
  if (text.length > max) return text.substring(0, max) + '\n\n... (truncated, ' + text.length + ' chars total — use specific filters or smaller limit)';
  return text;
}

function extractBody(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.body !== undefined) return obj.body;
  if (obj.data !== undefined) return obj.data;
  return null;
}

function formatBody(b) {
  if (b === null || b === undefined) return null;
  if (typeof b === 'string') {
    try { const parsed = JSON.parse(b); return formatBody(parsed); } catch (e) { return b; }
  }
  if (Array.isArray(b)) {
    if (b.length === 0) return '[]';
    const parts = b.map(function(x){ return formatBody(x); }).filter(Boolean);
    return parts.join(' | ');
  }
  if (typeof b === 'object') {
    if (b.code && b.message) {
      let s = b.code + ': ' + b.message;
      if (b.details && Object.keys(b.details).length) s += ' (' + JSON.stringify(b.details) + ')';
      return s;
    }
    if (b.error_description) return String(b.error_description);
    if (b.error && typeof b.error === 'string') return b.error;
    if (b.message) return String(b.message);
    if (b.data) { const d = formatBody(b.data); if (d) return d; }
    try { return JSON.stringify(b); } catch (e) {}
  }
  return String(b);
}

function errMsg(err) {
  if (!err) return 'unknown error';
  // Walk every plausible path where n8n / axios may stash the response body
  const candidates = [
    extractBody(err.response),
    extractBody(err.cause && err.cause.response),
    extractBody(err.context && err.context.response),
    err.response && err.response.data,
    err.cause && err.cause.response && err.cause.response.data,
    err.body,
    err.data,
    err.context && err.context.data,
    err.cause && err.cause.body,
    err.cause && err.cause.data
  ];
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const s = formatBody(c);
    if (s) return s;
  }
  const status = (err.response && (err.response.statusCode || err.response.status)) || err.httpCode || err.statusCode || '';
  const msg = err.description || err.message || (err.cause && err.cause.message) || '';
  if (status && msg) return 'HTTP ' + status + ' — ' + msg;
  if (msg) return msg;
  if (err.cause) { const c = errMsg(err.cause); if (c && c !== 'unknown error') return c; }
  try { return JSON.stringify(err, Object.getOwnPropertyNames(err)); } catch (e) {}
  return String(err);
}

// --- Auth: exchange grant code (first run only) ---
if (!creds.zoho_refresh_token && creds.zoho_grant_code) {
  try {
    const exchangeResp = await helpers.httpRequest({
      method: 'POST',
      url: ACCOUNTS + '/oauth/v2/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=authorization_code&client_id=' + encodeURIComponent(creds.zoho_client_id) + '&client_secret=' + encodeURIComponent(creds.zoho_client_secret) + '&code=' + encodeURIComponent(creds.zoho_grant_code),
      json: true
    });
    const newRefresh = exchangeResp && exchangeResp.refresh_token;
    if (!newRefresh) {
      return [{ json: { error: 'Zoho grant code exchange failed — no refresh_token returned. Response: ' + JSON.stringify(exchangeResp) + '. Likely cause: grant code expired (10-min TTL), already used, or scopes mismatch. Generate a fresh grant code in https://api-console.zoho.' + REGION + '/ (Self-Client -> Generate Code) and re-add via add_credential.' } }];
    }
    // Persist refresh token and remove single-use grant code
    const jsonPgHeaders = Object.assign({}, pgHeaders, { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' });
    try {
      await helpers.httpRequest({ method: 'DELETE', url: SUPABASE_URL + '/rest/v1/template_credentials?template_id=eq.zoho-crm&cred_key=eq.zoho_refresh_token', headers: pgHeaders });
    } catch (e) {}
    await helpers.httpRequest({
      method: 'POST',
      url: SUPABASE_URL + '/rest/v1/template_credentials',
      headers: jsonPgHeaders,
      body: JSON.stringify({ template_id: 'zoho-crm', cred_key: 'zoho_refresh_token', cred_value: newRefresh })
    });
    try {
      await helpers.httpRequest({ method: 'DELETE', url: SUPABASE_URL + '/rest/v1/template_credentials?template_id=eq.zoho-crm&cred_key=eq.zoho_grant_code', headers: pgHeaders });
    } catch (e) {}
    creds.zoho_refresh_token = newRefresh;
  } catch (err) {
    return [{ json: { error: 'Zoho grant code exchange failed: ' + errMsg(err) + '. Grant codes expire after 10 min and are single-use. Generate a fresh one in https://api-console.zoho.' + REGION + '/ -> Self-Client -> Generate Code, then re-add via add_credential.' } }];
  }
}

// --- Auth: refresh access token ---
let accessToken;
try {
  const tokenResp = await helpers.httpRequest({
    method: 'POST',
    url: ACCOUNTS + '/oauth/v2/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&client_id=' + encodeURIComponent(creds.zoho_client_id) + '&client_secret=' + encodeURIComponent(creds.zoho_client_secret) + '&refresh_token=' + encodeURIComponent(creds.zoho_refresh_token),
    json: true
  });
  accessToken = tokenResp.access_token;
  if (!accessToken) return [{ json: { error: 'Zoho auth failed: no access_token. Response: ' + JSON.stringify(tokenResp) + '. Check zoho_region (' + REGION + '), client_id/secret, and refresh_token validity.' } }];
} catch (err) {
  return [{ json: { error: 'Zoho auth failed: ' + errMsg(err) + '. Likely causes: wrong region (you set "' + REGION + '"), invalid refresh_token, revoked client. Re-generate a grant code in the Self-Client console and re-add credentials.' } }];
}

const authHeaders = { 'Authorization': 'Zoho-oauthtoken ' + accessToken };
const jsonHeaders = Object.assign({}, authHeaders, { 'Content-Type': 'application/json' });

async function zGet(path) {
  return await helpers.httpRequest({ method: 'GET', url: API + path, headers: authHeaders, json: true });
}
async function zPost(path, body) {
  return await helpers.httpRequest({ method: 'POST', url: API + path, headers: jsonHeaders, body: body, json: true });
}
async function zPut(path, body) {
  return await helpers.httpRequest({ method: 'PUT', url: API + path, headers: jsonHeaders, body: body, json: true });
}
async function zDelete(path) {
  return await helpers.httpRequest({ method: 'DELETE', url: API + path, headers: authHeaders, json: true });
}

// --- Dynamic field discovery (cache per execution) ---
// Zoho v8 rejects subform/compound fields in ?fields= and caps at 50 per request.
const SKIP_FIELD_TYPES = { subform: 1, ownerlookup: 1, formula: 0 };
const MAX_FIELDS = 50;
const fieldCache = {};
async function getFields(moduleName) {
  if (fieldCache[moduleName]) return fieldCache[moduleName];
  try {
    const r = await zGet('/settings/fields?module=' + encodeURIComponent(moduleName));
    const all = (r.fields || []).filter(function(f){
      if (!f || !f.api_name) return false;
      if (SKIP_FIELD_TYPES[f.data_type]) return false;
      if (f.view_type && f.view_type.view === false) return false;
      return true;
    });
    // Prioritize: non-custom system fields first, then custom fields. Cap at MAX_FIELDS.
    const sys = all.filter(function(f){ return !f.custom_field; }).map(function(f){ return f.api_name; });
    const custom = all.filter(function(f){ return f.custom_field; }).map(function(f){ return f.api_name; });
    const names = sys.concat(custom).slice(0, MAX_FIELDS);
    fieldCache[moduleName] = names;
    return names;
  } catch (err) {
    return [];
  }
}

async function fieldsParam(moduleName) {
  const names = await getFields(moduleName);
  if (!names.length) return '';
  return '&fields=' + encodeURIComponent(names.join(','));
}

function mergeCustomFields(props, raw) {
  if (!raw) return props;
  let obj;
  try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return props; }
  if (obj && typeof obj === 'object') Object.assign(props, obj);
  return props;
}

function buildProps(input, allowed) {
  const props = {};
  for (const f of allowed) if (input[f] !== undefined && input[f] !== '' && input[f] !== null) props[f] = input[f];
  mergeCustomFields(props, input.custom_fields);
  return props;
}

function recCreateOK(resp) {
  // Zoho wraps in {"data":[{"code":"SUCCESS","details":{"id":"...","Modified_Time":...}}]}
  if (!resp || !resp.data || !resp.data[0]) return { ok: false, err: 'empty response' };
  const d = resp.data[0];
  if (d.code === 'SUCCESS') return { ok: true, id: d.details && d.details.id };
  return { ok: false, err: (d.code || 'ERROR') + ': ' + (d.message || JSON.stringify(d)) };
}

function fmtRec(rec, primary) {
  // Render a record as "id - primary-field (extra1, extra2)"
  const id = rec.id || '(no id)';
  const name = primary ? (rec[primary] || '') : '';
  const kv = [];
  const skipKeys = { id: 1, '$approved': 1, '$approval': 1, '$currency_symbol': 1, '$converted': 1, '$editable': 1, '$process_flow': 1, '$review_process': 1, '$se_module': 1, '$review': 1, '$orchestration': 1, '$in_merge': 1, '$approval_state': 1, '$state': 1, '$locked_for_me': 1, 'Tag': 1 };
  skipKeys[primary] = 1;
  for (const k of Object.keys(rec)) {
    if (k.startsWith('$') || skipKeys[k]) continue;
    const v = rec[k];
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'object') {
      if (v.name) kv.push(k + '=' + v.name);
      continue;
    }
    const s = String(v);
    if (s.length > 60) continue;
    kv.push(k + '=' + s);
  }
  return id + (name ? ' - ' + name : '') + (kv.length ? ' | ' + kv.slice(0, 8).join(' | ') : '');
}

// Generic list handler
async function listRecords(moduleName, primary, limit) {
  const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 200);
  const fq = await fieldsParam(moduleName);
  try {
    const r = await zGet('/' + moduleName + '?per_page=' + lim + fq);
    const items = r.data || [];
    if (items.length === 0) return [{ json: { result: 'No ' + moduleName + '.' } }];
    let out = moduleName + ' (' + items.length + '):\n';
    for (const rec of items) out += '  ' + fmtRec(rec, primary) + '\n';
    if (r.info && r.info.more_records) out += '\n(more records available, raise limit or filter)';
    return [{ json: { result: truncate(out) } }];
  } catch (err) { return [{ json: { error: 'Zoho list ' + moduleName + ': ' + errMsg(err) } }]; }
}

async function searchRecords(moduleName, primary, input) {
  const limit = Math.min(Math.max(parseInt(input.limit) || 10, 1), 200);
  const word = input.word;
  const field = input.field;
  const operator = input.operator;
  const value = input.value;
  let queryStr;
  if (word) {
    queryStr = 'word=' + encodeURIComponent(word);
  } else if (field && operator && value !== undefined && value !== '') {
    const op = String(operator).toLowerCase();
    if (['equals', 'starts_with', 'contains'].indexOf(op) < 0) return [{ json: { error: 'Invalid operator "' + operator + '". Use: equals | starts_with | contains.' } }];
    queryStr = 'criteria=' + encodeURIComponent('(' + field + ':' + op + ':' + value + ')');
  } else {
    return [{ json: { error: 'Provide either "word" (full-text across all fields) OR "field" + "operator" (equals|starts_with|contains) + "value".' } }];
  }
  const fq = await fieldsParam(moduleName);
  try {
    const r = await zGet('/' + moduleName + '/search?' + queryStr + '&per_page=' + limit + fq);
    const items = (r && r.data) || [];
    if (items.length === 0) return [{ json: { result: 'No matches.' } }];
    let out = 'Matches (' + items.length + '):\n';
    for (const rec of items) out += '  ' + fmtRec(rec, primary) + '\n';
    return [{ json: { result: truncate(out) } }];
  } catch (err) {
    if (err && err.response && err.response.statusCode === 204) return [{ json: { result: 'No matches.' } }];
    return [{ json: { error: 'Zoho search ' + moduleName + ': ' + errMsg(err) } }];
  }
}

async function getRecord(moduleName, id, label) {
  if (!id) return [{ json: { error: 'Parameter "' + label + '_id" is required (Zoho record ID, 18-digit numeric).' } }];
  const fq = await fieldsParam(moduleName);
  try {
    const r = await zGet('/' + moduleName + '/' + encodeURIComponent(id) + '?' + fq.replace(/^&/, ''));
    const rec = (r.data || [])[0];
    if (!rec) return [{ json: { result: 'Record not found.' } }];
    let out = moduleName + ' ' + rec.id + '\n';
    for (const k of Object.keys(rec)) {
      if (k.startsWith('$') || k === 'id' || k === 'Tag') continue;
      const v = rec[k];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object') {
        if (v.name) out += k + ': ' + v.name + (v.id ? ' (' + v.id + ')' : '') + '\n';
      } else {
        let s = String(v);
        if (s.length > 300) s = s.substring(0, 300) + '…';
        out += k + ': ' + s + '\n';
      }
    }
    return [{ json: { result: truncate(out) } }];
  } catch (err) { return [{ json: { error: 'Zoho get ' + moduleName + ': ' + errMsg(err) } }]; }
}

async function createRecord(moduleName, props, label) {
  try {
    const resp = await zPost('/' + moduleName, { data: [props] });
    const ok = recCreateOK(resp);
    if (ok.ok) return [{ json: { result: label + ' created: ' + ok.id } }];
    return [{ json: { error: 'Zoho create ' + moduleName + ': ' + ok.err } }];
  } catch (err) { return [{ json: { error: 'Zoho create ' + moduleName + ': ' + errMsg(err) } }]; }
}

async function updateRecord(moduleName, id, props, label) {
  if (!id) return [{ json: { error: 'Parameter "' + label + '_id" is required.' } }];
  if (Object.keys(props).length === 0) return [{ json: { error: 'Provide at least one updatable field or custom_fields.' } }];
  try {
    const resp = await zPut('/' + moduleName + '/' + encodeURIComponent(id), { data: [props] });
    const ok = recCreateOK(resp);
    if (ok.ok) return [{ json: { result: label + ' ' + id + ' updated.' } }];
    return [{ json: { error: 'Zoho update ' + moduleName + ': ' + ok.err } }];
  } catch (err) { return [{ json: { error: 'Zoho update ' + moduleName + ': ' + errMsg(err) } }]; }
}

async function deleteRecord(moduleName, id, label) {
  if (!id) return [{ json: { error: 'Parameter "' + label + '_id" is required.' } }];
  try {
    const resp = await zDelete('/' + moduleName + '/' + encodeURIComponent(id));
    const ok = recCreateOK(resp);
    if (ok.ok) return [{ json: { result: label + ' ' + id + ' deleted (Soft-Delete — restorable from Recycle Bin for 60 days).' } }];
    return [{ json: { error: 'Zoho delete ' + moduleName + ': ' + ok.err } }];
  } catch (err) { return [{ json: { error: 'Zoho delete ' + moduleName + ': ' + errMsg(err) } }]; }
}

// === LEADS ===
if (action === 'list_leads') {
  return await listRecords('Leads', 'Last_Name', input.limit);
} else if (action === 'search_leads') {
  return await searchRecords('Leads', 'Last_Name', input);
} else if (action === 'get_lead') {
  return await getRecord('Leads', input.lead_id || input.id, 'lead');
} else if (action === 'create_lead') {
  if (!input.Last_Name) return [{ json: { error: 'Parameter "Last_Name" is required.' } }];
  if (!input.Company) return [{ json: { error: 'Parameter "Company" is required.' } }];
  const props = buildProps(input, ['First_Name', 'Last_Name', 'Company', 'Email', 'Phone', 'Mobile', 'Title', 'Lead_Source', 'Lead_Status', 'Industry', 'Description', 'Website', 'Rating', 'Annual_Revenue', 'No_of_Employees']);
  return await createRecord('Leads', props, 'Lead');
} else if (action === 'update_lead') {
  const props = buildProps(input, ['First_Name', 'Last_Name', 'Company', 'Email', 'Phone', 'Mobile', 'Title', 'Lead_Source', 'Lead_Status', 'Industry', 'Description', 'Website', 'Rating', 'Annual_Revenue', 'No_of_Employees']);
  return await updateRecord('Leads', input.lead_id || input.id, props, 'Lead');
} else if (action === 'delete_lead') {
  return await deleteRecord('Leads', input.lead_id || input.id, 'Lead');
} else if (action === 'convert_lead') {
  const leadId = input.lead_id || input.id;
  if (!leadId) return [{ json: { error: 'Parameter "lead_id" is required (Zoho Lead ID).' } }];
  const entry = { overwrite: true, notify_lead_owner: false, notify_new_entity_owner: false };
  if (input.Deal_Name || input.Stage || input.Closing_Date || input.Amount) {
    if (!input.Deal_Name) return [{ json: { error: 'If creating a Deal during conversion, "Deal_Name" is required.' } }];
    if (!input.Stage) return [{ json: { error: 'If creating a Deal during conversion, "Stage" is required (e.g. Qualification, Closed Won).' } }];
    if (!input.Closing_Date) return [{ json: { error: 'If creating a Deal during conversion, "Closing_Date" (YYYY-MM-DD) is required.' } }];
    const deal = { Deal_Name: input.Deal_Name, Stage: input.Stage, Closing_Date: input.Closing_Date };
    if (input.Amount !== undefined && input.Amount !== '') deal.Amount = input.Amount;
    if (input.Probability !== undefined && input.Probability !== '') deal.Probability = input.Probability;
    entry.Deals = deal;
  }
  if (input.assign_to) entry.assign_to = input.assign_to;
  try {
    const resp = await zPost('/Leads/' + encodeURIComponent(leadId) + '/actions/convert', { data: [entry] });
    const d = resp && resp.data && resp.data[0];
    if (!d) return [{ json: { error: 'Empty convert response.' } }];
    if (d.code !== 'SUCCESS') return [{ json: { error: 'Zoho convert_lead: ' + (d.code || 'ERROR') + ': ' + (d.message || JSON.stringify(d)) } }];
    const det = d.details || {};
    const parts = [];
    if (det.Contacts) parts.push('Contact=' + det.Contacts.id + (det.Contacts.name ? ' (' + det.Contacts.name + ')' : ''));
    if (det.Accounts) parts.push('Account=' + det.Accounts.id + (det.Accounts.name ? ' (' + det.Accounts.name + ')' : ''));
    if (det.Deals) parts.push('Deal=' + det.Deals.id + (det.Deals.name ? ' (' + det.Deals.name + ')' : ''));
    return [{ json: { result: 'Lead ' + leadId + ' converted successfully. ' + parts.join(', ') } }];
  } catch (err) { return [{ json: { error: 'Zoho convert_lead: ' + errMsg(err) } }]; }

// === CONTACTS ===
} else if (action === 'list_contacts') {
  return await listRecords('Contacts', 'Last_Name', input.limit);
} else if (action === 'search_contacts') {
  return await searchRecords('Contacts', 'Last_Name', input);
} else if (action === 'get_contact') {
  return await getRecord('Contacts', input.contact_id || input.id, 'contact');
} else if (action === 'create_contact') {
  if (!input.Last_Name) return [{ json: { error: 'Parameter "Last_Name" is required.' } }];
  const props = buildProps(input, ['First_Name', 'Last_Name', 'Email', 'Phone', 'Mobile', 'Title', 'Account_Name', 'Mailing_City', 'Mailing_Country', 'Mailing_State', 'Mailing_Street', 'Mailing_Zip', 'Department', 'Description']);
  return await createRecord('Contacts', props, 'Contact');
} else if (action === 'update_contact') {
  const props = buildProps(input, ['First_Name', 'Last_Name', 'Email', 'Phone', 'Mobile', 'Title', 'Account_Name', 'Mailing_City', 'Mailing_Country', 'Mailing_State', 'Mailing_Street', 'Mailing_Zip', 'Department', 'Description']);
  return await updateRecord('Contacts', input.contact_id || input.id, props, 'Contact');
} else if (action === 'delete_contact') {
  return await deleteRecord('Contacts', input.contact_id || input.id, 'Contact');

// === ACCOUNTS ===
} else if (action === 'list_accounts') {
  return await listRecords('Accounts', 'Account_Name', input.limit);
} else if (action === 'search_accounts') {
  return await searchRecords('Accounts', 'Account_Name', input);
} else if (action === 'get_account') {
  return await getRecord('Accounts', input.account_id || input.id, 'account');
} else if (action === 'create_account') {
  if (!input.Account_Name) return [{ json: { error: 'Parameter "Account_Name" is required.' } }];
  const props = buildProps(input, ['Account_Name', 'Phone', 'Website', 'Industry', 'Billing_City', 'Billing_Country', 'Billing_State', 'Billing_Street', 'Billing_Code', 'Description', 'Employees', 'Annual_Revenue', 'Account_Type']);
  return await createRecord('Accounts', props, 'Account');
} else if (action === 'update_account') {
  const props = buildProps(input, ['Account_Name', 'Phone', 'Website', 'Industry', 'Billing_City', 'Billing_Country', 'Billing_State', 'Billing_Street', 'Billing_Code', 'Description', 'Employees', 'Annual_Revenue', 'Account_Type']);
  return await updateRecord('Accounts', input.account_id || input.id, props, 'Account');

// === DEALS ===
} else if (action === 'list_deals') {
  return await listRecords('Deals', 'Deal_Name', input.limit);
} else if (action === 'search_deals') {
  return await searchRecords('Deals', 'Deal_Name', input);
} else if (action === 'get_deal') {
  return await getRecord('Deals', input.deal_id || input.id, 'deal');
} else if (action === 'create_deal') {
  if (!input.Deal_Name) return [{ json: { error: 'Parameter "Deal_Name" is required.' } }];
  if (!input.Stage) return [{ json: { error: 'Parameter "Stage" is required (common: Qualification, Needs Analysis, Value Proposition, Identify Decision Makers, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost). Use describe_module Deals to see exact picklist.' } }];
  if (!input.Closing_Date) return [{ json: { error: 'Parameter "Closing_Date" (YYYY-MM-DD) is required.' } }];
  const props = buildProps(input, ['Deal_Name', 'Stage', 'Closing_Date', 'Amount', 'Account_Name', 'Contact_Name', 'Probability', 'Type', 'Lead_Source', 'Description', 'Next_Step', 'Expected_Revenue']);
  return await createRecord('Deals', props, 'Deal');
} else if (action === 'update_deal') {
  const props = buildProps(input, ['Deal_Name', 'Stage', 'Closing_Date', 'Amount', 'Account_Name', 'Contact_Name', 'Probability', 'Type', 'Lead_Source', 'Description', 'Next_Step', 'Expected_Revenue']);
  return await updateRecord('Deals', input.deal_id || input.id, props, 'Deal');

// === TASKS ===
} else if (action === 'list_tasks') {
  return await listRecords('Tasks', 'Subject', input.limit);
} else if (action === 'get_task') {
  return await getRecord('Tasks', input.task_id || input.id, 'task');
} else if (action === 'create_task') {
  if (!input.Subject) return [{ json: { error: 'Parameter "Subject" is required.' } }];
  const props = buildProps(input, ['Subject', 'Description', 'Status', 'Priority', 'Due_Date', 'What_Id', 'Who_Id', 'Owner']);
  return await createRecord('Tasks', props, 'Task');
} else if (action === 'update_task') {
  const props = buildProps(input, ['Subject', 'Description', 'Status', 'Priority', 'Due_Date', 'What_Id', 'Who_Id', 'Owner']);
  return await updateRecord('Tasks', input.task_id || input.id, props, 'Task');
} else if (action === 'delete_task') {
  return await deleteRecord('Tasks', input.task_id || input.id, 'Task');

// === CASES ===
} else if (action === 'list_cases') {
  return await listRecords('Cases', 'Subject', input.limit);
} else if (action === 'get_case') {
  return await getRecord('Cases', input.case_id || input.id, 'case');
} else if (action === 'create_case') {
  if (!input.Subject) return [{ json: { error: 'Parameter "Subject" is required.' } }];
  if (!input.Status) return [{ json: { error: 'Parameter "Status" is required (New|On Hold|Closed|Escalated).' } }];
  const props = buildProps(input, ['Subject', 'Status', 'Description', 'Priority', 'Case_Origin', 'Type', 'Account_Name', 'Contact_Name', 'Reason']);
  return await createRecord('Cases', props, 'Case');
} else if (action === 'update_case') {
  const props = buildProps(input, ['Subject', 'Status', 'Description', 'Priority', 'Case_Origin', 'Type', 'Account_Name', 'Contact_Name', 'Reason']);
  return await updateRecord('Cases', input.case_id || input.id, props, 'Case');

// === NOTES ===
} else if (action === 'list_notes') {
  const parentModule = input.parent_module;
  const parentId = input.parent_id;
  if (!parentModule || !parentId) return [{ json: { error: 'Parameters "parent_module" (Leads|Contacts|Accounts|Deals|Tasks|Cases) and "parent_id" (record ID) are required.' } }];
  const lim = Math.min(Math.max(parseInt(input.limit) || 10, 1), 200);
  try {
    const r = await zGet('/' + encodeURIComponent(parentModule) + '/' + encodeURIComponent(parentId) + '/Notes?fields=Note_Title,Note_Content,Created_Time,Modified_Time,Created_By&per_page=' + lim);
    const items = (r && r.data) || [];
    if (items.length === 0) return [{ json: { result: 'No notes on ' + parentModule + ' ' + parentId + '.' } }];
    let out = 'Notes (' + items.length + '):\n';
    for (const n of items) {
      const t = n.Note_Title || '(no title)';
      const c = (n.Note_Content || '').replace(/\s+/g, ' ').substring(0, 200);
      const by = n.Created_By && n.Created_By.name ? ' by ' + n.Created_By.name : '';
      const when = n.Created_Time ? ' ' + n.Created_Time.substring(0, 10) : '';
      out += '  ' + n.id + by + when + ' — ' + t + (c ? ': ' + c : '') + '\n';
    }
    return [{ json: { result: truncate(out) } }];
  } catch (err) {
    if (err && err.response && err.response.statusCode === 204) return [{ json: { result: 'No notes.' } }];
    return [{ json: { error: 'Zoho list_notes: ' + errMsg(err) } }];
  }
} else if (action === 'create_note') {
  const parentModule = input.parent_module;
  const parentId = input.parent_id;
  if (!parentModule || !parentId) return [{ json: { error: 'Parameters "parent_module" and "parent_id" are required.' } }];
  if (!input.Note_Title && !input.Note_Content) return [{ json: { error: 'At least one of "Note_Title" or "Note_Content" is required.' } }];
  const entry = {
    Parent_Id: { id: parentId, module: { api_name: parentModule } }
  };
  if (input.Note_Title) entry.Note_Title = input.Note_Title;
  if (input.Note_Content) entry.Note_Content = input.Note_Content;
  try {
    const resp = await zPost('/Notes', { data: [entry] });
    const ok = recCreateOK(resp);
    if (ok.ok) return [{ json: { result: 'Note created: ' + ok.id + ' on ' + parentModule + ' ' + parentId } }];
    return [{ json: { error: 'Zoho create_note: ' + ok.err } }];
  } catch (err) { return [{ json: { error: 'Zoho create_note: ' + errMsg(err) } }]; }

// === USERS ===
} else if (action === 'list_users') {
  const userType = input.type || 'ActiveUsers';
  try {
    const r = await zGet('/users?type=' + encodeURIComponent(userType));
    const users = (r && r.users) || [];
    if (users.length === 0) return [{ json: { result: 'No users of type "' + userType + '".' } }];
    let out = 'Users (' + users.length + ', type=' + userType + '):\n';
    for (const u of users) {
      const role = u.role && u.role.name ? ' [' + u.role.name + ']' : '';
      const profile = u.profile && u.profile.name ? ' (' + u.profile.name + ')' : '';
      out += '  ' + u.id + ' — ' + (u.full_name || (u.first_name || '') + ' ' + (u.last_name || '')).trim() + profile + role + ' <' + (u.email || '') + '>\n';
    }
    return [{ json: { result: truncate(out) } }];
  } catch (err) { return [{ json: { error: 'Zoho list_users: ' + errMsg(err) } }]; }

// === GENERIC ===
} else if (action === 'coql_query') {
  const query = input.query;
  if (!query) return [{ json: { error: 'Parameter "query" is required. Zoho v8 REQUIRES a WHERE clause. Example: "SELECT First_Name, Last_Name, Email FROM Leads WHERE Last_Name is not null LIMIT 10". Use Zoho field api_names (Last_Name not lastname — run describe_module to list them).' } }];
  try {
    const resp = await zPost('/coql', { select_query: String(query) });
    const items = resp.data || [];
    if (items.length === 0) return [{ json: { result: 'Query returned 0 records.' } }];
    let out = 'COQL result (' + items.length + (resp.info && resp.info.more_records ? ', more available' : '') + '):\n';
    for (const rec of items) {
      const kv = [];
      for (const k of Object.keys(rec)) {
        if (k.startsWith('$')) continue;
        const v = rec[k];
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'object') { if (v.name) kv.push(k + '=' + v.name); continue; }
        kv.push(k + '=' + String(v));
      }
      out += '  ' + kv.join(' | ') + '\n';
    }
    return [{ json: { result: truncate(out) } }];
  } catch (err) { return [{ json: { error: 'Zoho coql_query: ' + errMsg(err) } }]; }

} else if (action === 'describe_module') {
  const moduleName = input.module_name || input.module;
  if (!moduleName) return [{ json: { error: 'Parameter "module_name" is required (e.g. Leads, Contacts, Accounts, Deals, Tasks, Cases, Products, Quotes).' } }];
  try {
    const r = await zGet('/settings/fields?module=' + encodeURIComponent(moduleName));
    const fields = r.fields || [];
    if (!fields.length) return [{ json: { result: 'No fields returned for module "' + moduleName + '". Check spelling (case-sensitive).' } }];
    let out = 'Module: ' + moduleName + ' — ' + fields.length + ' fields\n';
    for (const f of fields) {
      let line = '  ' + f.api_name + ' (' + (f.data_type || '?') + ')';
      if (f.custom_field) line += ' [custom]';
      if (f.system_mandatory || (f.required)) line += ' REQUIRED';
      if (!f.read_only === false && f.read_only) line += ' [read-only]';
      if (f.data_type === 'picklist' && f.pick_list_values && f.pick_list_values.length) {
        const vals = f.pick_list_values.map(function(p){ return p.actual_value || p.display_value; }).filter(Boolean);
        if (vals.length) line += ' values=[' + vals.slice(0, 10).join(', ') + (vals.length > 10 ? ', ...' : '') + ']';
      }
      out += line + '\n';
    }
    return [{ json: { result: truncate(out, 10000) } }];
  } catch (err) { return [{ json: { error: 'Zoho describe_module: ' + errMsg(err) } }]; }

} else {
  return [{ json: { error: 'Unknown action: "' + action + '". Available: list_leads, search_leads, get_lead, create_lead, update_lead, delete_lead, convert_lead, list_contacts, search_contacts, get_contact, create_contact, update_contact, delete_contact, list_accounts, search_accounts, get_account, create_account, update_account, list_deals, search_deals, get_deal, create_deal, update_deal, list_tasks, get_task, create_task, update_task, delete_task, list_cases, get_case, create_case, update_case, list_notes, create_note, list_users, coql_query, describe_module.' } }];
}
