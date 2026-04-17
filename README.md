# n8n-claw Skills

Skill catalog for [n8n-claw](https://github.com/freddy-schuetz/n8n-claw) MCP servers. Install pre-built API integrations with a single chat command — no coding required.

---

## Available Skills (62)

| Category | Skills | Focus |
|----------|:------:|-------|
| [Analytics](#analytics) | 1 | Google Analytics |
| [Calendar](#calendar) | 2 | CalDAV, Google Calendar |
| [Cloud Storage](#cloud-storage) | 3 | Google Drive, Nextcloud, Seafile |
| [Communication](#communication) | 4 | Email, Gmail, ntfy, OpenClaw |
| [Creativity](#creativity) | 2 | AI image & video generation, Unsplash photos |
| [Developer Tools](#developer-tools) | 1 | GitHub |
| [Entertainment](#entertainment) | 4 | Recipes, movies, trivia, YouTube |
| [Finance](#finance) | 6 | Crypto, currencies, banking, Finnhub stocks, Lexware, Stripe |
| [Knowledge](#knowledge) | 5 | DeepWiki, food facts, Open Library, OpenWebUI RAG, Wikipedia |
| [Language](#language) | 2 | Translation, dictionary |
| [Maps](#maps) | 2 | OpenStreetMap / Overpass POI search, OpenRouteService routing |
| [Marketing](#marketing) | 2 | Google Ads, HubSpot CRM |
| [Meetings](#meetings) | 1 | Vexa (Google Meet, Teams, Zoom) |
| [Network](#network) | 2 | IP geolocation, website checks |
| [News](#news) | 2 | Hacker News, NewsAPI |
| [Notes & CRM](#notes--crm) | 4 | Airtable, Confluence Cloud, NocoDB, Notion |
| [Reference](#reference) | 3 | Countries, holidays, timezones |
| [Smart Home](#smart-home) | 1 | Home Assistant |
| [Tasks](#tasks) | 4 | Asana, Jira Cloud, Todoist, Vikunja |
| [Tourism](#tourism) | 1 | DZT Germany Tourism |
| [Transport](#transport) | 5 | Deutsche Bahn, ÖBB, SBB, ÖPNV Deutschland, Wiener Linien |
| [Utilities](#utilities) | 3 | Backup, PDF tools, QR codes |
| [Weather](#weather) | 2 | Open-Meteo forecasts, OpenAQ air quality |

> **Tested column** — A ✓ in the *Tested* column means the skill has been verified end-to-end on at least one live n8n-claw instance (install + tool call working as expected). An empty cell means the skill is published but has not been hands-on verified yet.

### Analytics

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Google Analytics](https://analytics.google.com/) | Query GA4 reports, properties, and realtime data | Google OAuth2 | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Calendar

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| CalDAV Calendar | Manage calendars on any CalDAV server — list, create, update, delete events (Nextcloud, Radicale, Baikal) | CalDAV URL, Username, Password | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Google Calendar](https://calendar.google.com/) | List, create, update, delete events in Google Calendar | Google OAuth2 | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Cloud Storage

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Google Drive](https://drive.google.com/) | List, search, read, create, and share files in Google Drive | Google OAuth2 | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Nextcloud Files](https://nextcloud.com) | Manage files on Nextcloud via WebDAV — list, read, write, upload from URL, move, delete | Nextcloud URL, Username, App Password | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Seafile](https://www.seafile.com/) | Manage files on a Seafile library: browse, read, create, download, rename, move, copy, delete | Seafile URL, Library API Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Communication

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| Email (IMAP/SMTP) | Read and send emails via IMAP/SMTP | Email address, password, IMAP host, SMTP host | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Gmail](https://mail.google.com/) | Search, read, send emails and manage drafts via Gmail API | Google OAuth2 | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [ntfy.sh](https://ntfy.sh/) | Send push notifications to your phone (hosted or self-hosted). Title, priority, emoji tags, tap URLs, attachments | ntfy Topic Name | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [OpenClaw](https://openclaw.ai/) | Connect to an OpenClaw autonomous AI agent via Gateway API | Gateway URL, Gateway Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Creativity

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Google Media Generation](https://aistudio.google.com/) | Generate and edit images with Nano Banana Pro (Gemini 3 Pro Image), generate videos from text with Veo 3.1, and animate user-supplied images into videos (image-to-video) | Google Gemini API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Unsplash](https://unsplash.com/) | Search 3M+ free high-quality photos by keyword, get random or specific photos with required photographer attribution | Unsplash Access Key | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |

### Developer Tools

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [GitHub](https://github.com/) | Full GitHub integration: repos, issues, PRs, code search, file content, releases, notifications | GitHub PAT | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Entertainment

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Recipes](https://www.themealdb.com/) | Search recipes or get a random recipe with ingredients and instructions | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [TMDB Movies & TV](https://www.themoviedb.org/) | Search movies and TV shows, discover trending titles | TMDB API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Trivia](https://opentdb.com/) | Random trivia questions with answers from various categories | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [YouTube Data](https://developers.google.com/youtube/v3) | Search YouTube videos, fetch video/channel metadata, list a channel's recent uploads (search/metadata only, no transcripts) | YouTube Data API v3 Key | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |

### Finance

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Crypto Prices](https://www.coingecko.com/) | Get cryptocurrency prices, market cap, and 24h changes | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Exchange Rates](https://www.frankfurter.app/) | Convert currencies using live exchange rates | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Finnhub Stocks](https://finnhub.io/) | Real-time stock quotes, company profiles, news, symbol search and market-status checks (free tier: 60 calls/min) | Finnhub API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |
| [KontoFlux](https://kontoflux.io/) | Access German bank accounts and transactions via KontoFlux Open-Banking API (5000+ banks, read-only) | KontoFlux API Key, Workspace ID | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Lexware Office](https://www.lexware.de/office/) | Full Lexware Office integration: contacts, articles, quotations, invoices, voucher upload, PDF download | Lexware API Token | [@Ranji1908](https://github.com/Ranji1908) | ✓ |
| [Stripe](https://stripe.com/) | Stripe payments (23 tools): customers, payments, invoices, subscriptions, refunds, payouts, balance, payment links. Test-mode recommended for AI agents | Stripe API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Knowledge

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [DeepWiki](https://deepwiki.com/) | AI-powered documentation search for any public GitHub repository — ask questions about a codebase in plain English (external MCP server, free) | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Open Library](https://openlibrary.org/) | Search 40M+ books by title, author or ISBN; fetch book and author details including cover images | - | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |
| [OpenFoodFacts](https://world.openfoodfacts.org/) | Look up food products by barcode or name — nutrition facts, Nutri-Score, allergens, ingredients | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [OpenWebUI Knowledge](https://openwebui.com/) | Manage knowledge collections and RAG files — create collections, upload documents, ingest web pages | OpenWebUI URL, API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Wikipedia](https://www.wikipedia.org/) | Search Wikipedia and get article summaries | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Language

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [DeepL Translate](https://www.deepl.com/) | Translate text between 30+ languages and detect languages | DeepL API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Dictionary](https://dictionaryapi.dev/) | English word definitions, phonetics, and examples | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Maps

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Overpass (OpenStreetMap)](https://overpass-api.de/) | Search places and POIs on OSM: restaurants, hotels, hiking huts, drinking water, EV charging (28 preset categories). Forward + reverse geocoding via Nominatim | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Route Planner](https://openrouteservice.org/) | Plan hiking, cycling, and walking routes with GPX output, POI search, elevation profiles, isochrones (ORS + BRouter) | ORS API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Marketing

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Google Ads](https://ads.google.com/) | Query campaigns, ad groups, and performance data via GAQL (Beta) | Google OAuth2, Developer Token, Customer ID | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [HubSpot CRM](https://www.hubspot.com/) | Full CRM (28 tools): contacts, companies, deals, tickets (CRUD), engagements (notes, tasks), associations (v4), pipelines, owners. Private App token auth | HubSpot Private App Access Token | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |

### Meetings

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Vexa Meetings](https://vexa.ai/) | Deploy transcription bots to Google Meet, Teams, and Zoom meetings | Vexa API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Network

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [IP Geolocation](https://ip-api.com/) | Get location, ISP, and org info for any IP address | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| Website Check | Website health check: load time, security headers, meta tags, structured data | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### News

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Hacker News](https://news.ycombinator.com/) | Search Hacker News stories and get top stories | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [NewsAPI](https://newsapi.org/) | Search news articles from 80,000+ sources | NewsAPI Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Notes & CRM

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Airtable](https://airtable.com/) | Work with Airtable bases and records: list bases/tables, search with formulas, CRUD rows. Free plan has 1,000 API calls/month — Team plan recommended for active use | Airtable PAT | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Confluence Cloud](https://www.atlassian.com/software/confluence) | Confluence wiki (14 tools): CQL search, CRUD pages, comments, labels, spaces. Shares Atlassian credentials with Jira | Atlassian Email, API Token, Site URL | [@freddy-schuetz](https://github.com/freddy-schuetz) | |
| [NocoDB CRM](https://nocodb.com/) | Manage NocoDB tables and records: list bases, tables, CRUD with filtering and sorting | NocoDB URL, API Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Notion](https://www.notion.so/) | Search, read, and create Notion pages with markdown content support | Notion Integration Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Reference

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Country Info](https://restcountries.com/) | Country details: capital, population, languages, currencies | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Public Holidays](https://date.nager.at/) | Look up public holidays for any country | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Timezone & World Clock](https://timeapi.io/) | Get current time in any timezone and convert between timezones | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Smart Home

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Home Assistant](https://www.home-assistant.io/) | Control your smart home: list entities, check states, call services (lights, switches, climate, media, scenes). Requires publicly reachable HA instance | HA URL, Long-Lived Access Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Tasks

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Asana](https://asana.com/) | Full Asana CRUD (16 tools): workspaces, projects, sections, tasks incl. subtasks, comments, Kanban section moves, typeahead search for users and tasks | Asana PAT | [@freddy-schuetz](https://github.com/freddy-schuetz) | |
| [Jira Cloud](https://www.atlassian.com/software/jira) | Jira issue tracking (12 tools): JQL search, CRUD issues, comments, transitions, issue links, user search. Shares Atlassian creds with Confluence | Atlassian Email, API Token, Site URL | [@freddy-schuetz](https://github.com/freddy-schuetz) | |
| [Todoist](https://todoist.com/) | Manage tasks: list, create, complete, organize with due dates and priorities | Todoist API Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Vikunja](https://vikunja.io/) | Manage tasks and projects: list, create, update, delete with due dates and priorities | Vikunja URL, API Token | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Tourism

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [DZT Germany Tourism](https://www.germany.travel/) | Search German tourism data: POIs, events, trails, and entity details (via One.Intelligence) | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Transport

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [Deutsche Bahn](https://v6.db.transport.rest/) | Search train connections, departures, and stations across Germany | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [ÖBB](https://v6.oebb.transport.rest/api/) | Search train connections, departures, and stations across Austria (ÖBB) | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [ÖPNV Deutschland](https://www.opendata-oepnv.de/) | Nationwide German public transit (S-Bahn, U-Bahn, Tram, Bus, regional) via EFA/DELFI. **Note:** uses the public `openservice-test.vrr.de` test endpoint — realtime data (delays, cancellations) is not always current; planned schedule is reliable | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [SBB](https://transport.opendata.ch/) | Search train connections, departures, and stations across Switzerland (SBB/CFF/FFS) | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [Wiener Linien](https://www.wienerlinien.at/) | Plan routes with Vienna public transport, get your station ID from [this CSV File](https://data.wien.gv.at/csv/wienerlinien-ogd-haltestellen.csv) (yes, a CSV file, don't ask), more details on the [Routingservice Wien](https://www.data.gv.at/datasets/9c203fec-dc0d-412c-a7a3-7fd77d0346f1?locale=de) page | - | [@lcx](https://github.com/lcx) | ✓ |

### Utilities

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| Config Backup & Restore | Back up and restore n8n-claw config as downloadable JSON files | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [PDF Tools](https://pdf-mcp.io/) | Generate PDFs from HTML, extract text, merge PDFs | pdf-mcp.io API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |
| [QR Code](https://goqr.me/) | Generate QR codes from text or URLs | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

### Weather

| Skill | Description | Credentials | Author | Tested |
|-------|-------------|-------------|--------|:------:|
| [OpenAQ Air Quality](https://openaq.org/) | Current air quality (PM2.5, PM10, NO2, O3, SO2, CO) from government monitoring stations worldwide; supports city names or coordinates | OpenAQ API Key | [@freddy-schuetz](https://github.com/freddy-schuetz) |  |
| [Weather](https://open-meteo.com/) | Current weather and 3-day forecast for any city | - | [@freddy-schuetz](https://github.com/freddy-schuetz) | ✓ |

---

## Usage

Skills are managed via chat with your n8n-claw agent:

```
"What skills are available?"        → lists all skills
"Install weather-openmeteo"         → installs the skill
"Remove weather-openmeteo"          → uninstalls and cleans up
```

### Skills with API keys

Some skills require API credentials. When you install one, the agent sends you a **secure one-time link** (valid 10 minutes) to enter your API key via HTTPS form. Your key is never visible in the chat.

```
"Install news-newsapi"                → installs + sends credential link
"Add credential for news-newsapi"     → generates a new credential link
```

> **⚠️ Security notice — Skill credentials are stored in plain text**
>
> API keys entered via the credential form are currently stored **unencrypted** in the `template_credentials` table in PostgreSQL. This means:
>
> - Anyone with access to the database can read all stored API keys
> - Supabase Studio (`localhost:3001`, accessible via SSH tunnel) shows credentials in plain text
> - A compromised VPS exposes all stored API keys
>
> **What an attacker would need:** Neither the database nor the API are reachable from the internet. PostgREST runs on a Docker-internal network only, and PostgreSQL (port 5432) is bound to `127.0.0.1`. To read credentials, an attacker would need SSH access to your VPS — there is no remote network path.
>
> **Mitigation:** Secure SSH access (key-based auth, no root password, fail2ban), and use API keys with minimal permissions where possible.
>
> Encryption at rest for skill credentials is planned and in progress.

### Skills with infrastructure requirements

Some skills need additional services running alongside n8n:

| Skill | Requires |
|----------|----------|
| `email-imap-smtp` | `email-bridge` service in docker-compose.yml (included in n8n-claw since v0.10) |

---

## Skill Types

| Type | Description |
|------|-------------|
| `native` | n8n implements the tool logic directly (HTTP requests, Code nodes) |
| `bridge` | Registers an existing external MCP server (Streamable HTTP) with optional bearer/header auth. No workflows are imported. See the [Bridge Templates](templates/TEMPLATE_EXAMPLE.md#bridge-templates) section in `TEMPLATE_EXAMPLE.md`. Supported since n8n-claw v1.3.0. |

---

## Creating a Template

### Directory structure

Each template lives in its own directory under `templates/`:

```
templates/
  index.json                  ← catalog (add your template here)
  my-template/
    manifest.json             ← metadata (name, tools, credentials)
    workflow.json             ← n8n workflow bundle (two workflows)
    README.md                 ← optional: usage notes
```

### Step 1: Add to `index.json`

Add an entry to the `templates` array in [`templates/index.json`](templates/index.json):

```json
{
  "id": "my-template",
  "name": "My Template",
  "type": "native",
  "category": "utilities",
  "description": "Short description of what this template does",
  "credentials_required": [],
  "version": "1.0.0"
}
```

### Step 2: Create `manifest.json`

```json
{
  "id": "my-template",
  "name": "My Template",
  "version": "1.0.0",
  "updated": "2026-03-08",
  "type": "native",
  "category": "utilities",
  "description": "Short description of what this template does",
  "credentials_required": [],
  "credentials_optional": [
    {
      "key": "some_api_key",
      "label": "Some API Key",
      "hint": "Only needed for premium features"
    }
  ],
  "tools": [
    {
      "name": "my_tool",
      "description": "What this tool does"
    }
  ],
  "author": "your-github-username",
  "license": "MIT",
  "tested_n8n_version": "2.10.4"
}
```

#### Manifest fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique template ID (lowercase, hyphens only) |
| `name` | yes | Display name |
| `version` | yes | Semver version (e.g. `1.0.0`) |
| `updated` | yes | Last updated date (ISO format, e.g. `2026-03-08`) |
| `type` | yes | `native` or `bridge` |
| `category` | yes | Category for filtering (e.g. `weather`, `utilities`, `data`) |
| `description` | yes | Short description |
| `credentials_required` | yes | Array of credential keys needed (empty array if none) |
| `credentials_optional` | no | Array of optional credentials with hints |
| `tools` | yes | Array of tools this template provides (`name` + `description`) |
| `author` | yes | GitHub username |
| `license` | yes | License identifier (e.g. `MIT`) |
| `tested_n8n_version` | yes | n8n version this was tested on |

### Step 3: Create `workflow.json`

The workflow bundle uses the `n8n-claw-template` format. Every template consists of **two workflows**:

1. **Sub-workflow** (`sub`) — contains the actual tool logic (Code node)
2. **Server workflow** (`server`) — the MCP server that exposes the tool (mcpTrigger + toolWorkflow)

This two-workflow pattern is required because n8n's API ignores `specifyInputSchema` when creating workflows, so `toolCode` parameters don't work. The `toolWorkflow` pattern avoids this bug.

```json
{
  "format": "n8n-claw-template",
  "format_version": 1,
  "sub": {
    "name": "MCP Sub: My Template",
    "settings": {
      "executionOrder": "v1",
      "callerPolicy": "workflowsFromSameOwner"
    },
    "nodes": [
      {
        "id": "sub-trigger",
        "name": "Execute Workflow Trigger",
        "type": "n8n-nodes-base.executeWorkflowTrigger",
        "typeVersion": 1.1,
        "position": [0, 0],
        "parameters": { "inputSource": "passthrough" }
      },
      {
        "id": "sub-code",
        "name": "My Tool Logic",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [256, 0],
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst city = input.city || 'Berlin';\n\n// Make HTTP requests with helpers.httpRequest()\nconst data = await helpers.httpRequest({\n  method: 'GET',\n  url: 'https://api.example.com/data?q=' + encodeURIComponent(city)\n});\n\nreturn [{ json: { result: data } }];"
        }
      }
    ],
    "connections": {
      "Execute Workflow Trigger": {
        "main": [[{ "node": "My Tool Logic", "type": "main", "index": 0 }]]
      }
    }
  },
  "server": {
    "name": "MCP: My Template",
    "settings": { "executionOrder": "v1" },
    "nodes": [
      {
        "id": "mcp-trigger",
        "name": "MCP Server Trigger",
        "type": "@n8n/n8n-nodes-langchain.mcpTrigger",
        "typeVersion": 2,
        "position": [0, 0],
        "parameters": { "path": "my-template" }
      },
      {
        "id": "tool-wf",
        "name": "my_tool",
        "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
        "typeVersion": 2.2,
        "position": [0, 300],
        "parameters": {
          "name": "my_tool",
          "description": "What this tool does. Parameter: city (city name)",
          "workflowId": {
            "__rl": true,
            "value": "REPLACE_SUB_WORKFLOW_ID",
            "mode": "id"
          },
          "workflowInputs": {
            "mappingMode": "defineBelow",
            "value": {
              "city": "={{ $fromAI('city', 'The city name', 'string') }}"
            },
            "matchingColumns": [],
            "schema": [
              {
                "id": "city",
                "displayName": "city",
                "type": "string",
                "description": "The city name",
                "required": true
              }
            ],
            "attemptToConvertTypes": false,
            "convertFieldsToString": false
          }
        }
      }
    ],
    "connections": {
      "my_tool": {
        "ai_tool": [[{ "node": "MCP Server Trigger", "type": "ai_tool", "index": 0 }]]
      }
    }
  }
}
```

### Key points

| Topic | Details |
|-------|---------|
| **HTTP requests** | Use `helpers.httpRequest()` in Code nodes — **not** `$helpers.httpRequest()` (undefined in Code node v2) |
| **Sub-workflow ID** | Use `REPLACE_SUB_WORKFLOW_ID` as placeholder — the Library Manager patches this automatically during install |
| **DB access** | Templates that read credentials use `{{SUPABASE_URL}}` and `{{SUPABASE_SERVICE_KEY}}` placeholders — replaced automatically during install |
| **MCP path** | The `path` in mcpTrigger should match your template ID |
| **Parameters** | Tool parameters arrive in the sub-workflow via `$input.first().json.paramName` |
| **`$fromAI()`** | Used in the server workflow to tell the AI agent which parameters to extract from the user's message |
| **Connections** | toolWorkflow connects to mcpTrigger via `ai_tool`, not `main` |

---

## Testing your template

Before submitting a pull request, test your template locally:

1. **Validate JSON** — ensure `manifest.json` and `workflow.json` are valid JSON
2. **Import manually** — import the sub-workflow and server workflow into your n8n instance via the API or UI
3. **Test the MCP server** — call the tool via the n8n-claw agent or directly via MCP client
4. **Check the response** — verify the tool returns useful data in the expected format

You can also test via the Library Manager if you push your template to a fork and temporarily change the CDN_BASE URL in the Library Manager workflow.

---

## Contributing

1. Fork this repository
2. Create a directory under `templates/` with your template ID
3. Add `manifest.json` and `workflow.json` (see above)
4. Add an entry to `templates/index.json`
5. Submit a pull request

### PR checklist

- [ ] Template ID is lowercase with hyphens only (e.g. `my-api-tool`)
- [ ] `manifest.json` has all required fields
- [ ] `workflow.json` uses `n8n-claw-template` format with `sub` and `server`
- [ ] `REPLACE_SUB_WORKFLOW_ID` is used as the workflowId placeholder
- [ ] Code uses `helpers.httpRequest()` (not `$helpers`)
- [ ] `index.json` entry matches manifest data
- [ ] Template tested on a live n8n instance
- [ ] All text in English

---

## CDN

Templates are served via jsDelivr CDN for fast, reliable delivery:

```
https://cdn.jsdelivr.net/gh/freddy-schuetz/n8n-claw-templates@master/templates/index.json
https://cdn.jsdelivr.net/gh/freddy-schuetz/n8n-claw-templates@master/templates/{id}/manifest.json
https://cdn.jsdelivr.net/gh/freddy-schuetz/n8n-claw-templates@master/templates/{id}/workflow.json
```

The CDN uses the `@master` branch reference. Cache updates may take a few minutes after pushing changes. For a reference of template files, see [`templates/TEMPLATE_EXAMPLE.md`](templates/TEMPLATE_EXAMPLE.md).

---

## License

MIT
