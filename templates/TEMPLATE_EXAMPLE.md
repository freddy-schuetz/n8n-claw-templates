# Template Structure

Each template lives in its own directory under `templates/` and consists of three parts:

## Directory Layout

```
templates/
  index.json              # Catalog (add your template here)
  my-template/
    manifest.json          # Metadata
    workflow.json          # n8n workflow bundle
```

## 1. index.json entry

Add your template to the `templates` array in `index.json`:

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

## 2. manifest.json

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

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique template ID (lowercase, hyphens) |
| `name` | yes | Display name |
| `version` | yes | Semver version |
| `updated` | yes | Last updated date (ISO format, e.g. `2026-03-08`) |
| `type` | yes | `native` (n8n implements logic) or `bridge` (proxy to external MCP server) |
| `category` | yes | Category for filtering (e.g. `weather`, `utilities`, `data`) |
| `description` | yes | Short description |
| `credentials_required` | yes | Array of credential keys needed (empty if none) |
| `credentials_optional` | no | Array of optional credentials with hints |
| `tools` | yes | Array of tools this template provides |
| `author` | yes | GitHub username |
| `license` | yes | License identifier |
| `tested_n8n_version` | yes | n8n version this was tested on |

## 3. workflow.json

The workflow bundle uses the `n8n-claw-template` format with two workflows:

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
        "parameters": {
          "inputSource": "passthrough"
        }
      },
      {
        "id": "sub-code",
        "name": "My Tool Logic",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [256, 0],
        "parameters": {
          "jsCode": "const input = $input.first().json;\n// Your tool logic here\n// Access parameters via input.paramName\nreturn [{ json: { result: 'hello' } }];"
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
    "settings": {
      "executionOrder": "v1"
    },
    "nodes": [
      {
        "id": "mcp-trigger",
        "name": "MCP Server Trigger",
        "type": "@n8n/n8n-nodes-langchain.mcpTrigger",
        "typeVersion": 2,
        "position": [0, 0],
        "parameters": {
          "path": "my-template"
        }
      },
      {
        "id": "tool-wf",
        "name": "my_tool",
        "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
        "typeVersion": 2.2,
        "position": [0, 300],
        "parameters": {
          "name": "my_tool",
          "description": "What this tool does. Parameter: param1 (description)",
          "workflowId": {
            "__rl": true,
            "value": "REPLACE_SUB_WORKFLOW_ID",
            "mode": "id"
          },
          "workflowInputs": {
            "mappingMode": "defineBelow",
            "value": {
              "param1": "={{ $fromAI('param1', 'Description of param1', 'string') }}"
            },
            "matchingColumns": [],
            "schema": [
              {
                "id": "param1",
                "displayName": "param1",
                "type": "string",
                "description": "Description of param1",
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

- **sub** = the sub-workflow with actual tool logic (Code node)
- **server** = the MCP server workflow (mcpTrigger + toolWorkflow)
- Use `REPLACE_SUB_WORKFLOW_ID` as placeholder — the Library Manager patches this automatically
- Use `helpers.httpRequest()` for HTTP calls in Code nodes (NOT `$helpers`)
- The `path` in mcpTrigger should match your template ID
- Tool parameters arrive via `$input.first().json.paramName`
