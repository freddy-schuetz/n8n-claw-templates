#!/usr/bin/env python
"""Build zoho-crm/workflow.json from logic.js + tool specs."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LOGIC_PATH = os.path.join(HERE, "logic.js")
OUT_PATH = os.path.join(HERE, "workflow.json")

# ===== TOOL DEFINITIONS =====
# Each: (action, description, [ (param_name, ai_description), ... ])
TOOLS = [
    # Leads (6)
    ("list_leads", "List recent Zoho Leads. Returns all fields (incl. custom fields).", [
        ("limit", "Max results 1-200, default 10"),
    ]),
    ("search_leads", "Search Zoho Leads. Use either word (full-text) OR field+operator+value (criteria).", [
        ("word", "Full-text search term across all fields (recommended)"),
        ("field", "Field api_name for criteria search (Email, Phone, Last_Name, Company, ...)"),
        ("operator", "equals | starts_with | contains"),
        ("value", "Value to match in criteria search"),
        ("limit", "Max results, default 10"),
    ]),
    ("get_lead", "Get single Zoho Lead by Id. Returns all fields.", [
        ("lead_id", "Zoho Lead ID (18-digit numeric)"),
    ]),
    ("create_lead", "Create a Zoho Lead. Required: Last_Name, Company.", [
        ("Last_Name", "REQUIRED — Last name"),
        ("Company", "REQUIRED — Company/organization name"),
        ("First_Name", "First name"),
        ("Email", "Primary email"),
        ("Phone", "Phone number"),
        ("Mobile", "Mobile number"),
        ("Title", "Job title"),
        ("Lead_Source", "Lead source (e.g. Cold Call, Web, Referral)"),
        ("Lead_Status", "Lead status (e.g. Not Contacted, Contacted, Qualified)"),
        ("Industry", "Industry"),
        ("Description", "Notes/description"),
        ("custom_fields", "JSON string for custom fields, e.g. '{\"VIP_Status\":true}'"),
    ]),
    ("update_lead", "Update a Zoho Lead by Id. Any subset of fields.", [
        ("lead_id", "Zoho Lead ID"),
        ("First_Name", "First name"),
        ("Last_Name", "Last name"),
        ("Company", "Company name"),
        ("Email", "Email"),
        ("Phone", "Phone"),
        ("Title", "Job title"),
        ("Lead_Source", "Lead source"),
        ("Lead_Status", "Lead status"),
        ("Industry", "Industry"),
        ("Description", "Notes"),
        ("custom_fields", "JSON string for custom fields"),
    ]),
    ("delete_lead", "Delete a Zoho Lead by Id (Soft-Delete, 60d Recycle Bin).", [
        ("lead_id", "Zoho Lead ID"),
    ]),
    ("convert_lead", "Convert a Zoho Lead into Contact + Account (+ optional Deal). Zoho's classic Lead-Qualification flow.", [
        ("lead_id", "REQUIRED — Zoho Lead ID to convert"),
        ("Deal_Name", "Optional — create a Deal during conversion; Deal_Name required if any Deal-* field is set"),
        ("Stage", "Deal Stage (e.g. Qualification, Closed Won) — required if creating a Deal"),
        ("Closing_Date", "Deal Closing_Date YYYY-MM-DD — required if creating a Deal"),
        ("Amount", "Deal Amount (number) — optional"),
        ("Probability", "Deal Probability 0-100 — optional"),
        ("assign_to", "User ID to assign new Contact/Account/Deal to — optional"),
    ]),

    # Contacts (6)
    ("list_contacts", "List recent Zoho Contacts. Returns all fields.", [
        ("limit", "Max results 1-200, default 10"),
    ]),
    ("search_contacts", "Search Zoho Contacts. word OR field+operator+value.", [
        ("word", "Full-text search"),
        ("field", "Field name (Email, Phone, Last_Name, Account_Name, ...)"),
        ("operator", "equals | starts_with | contains"),
        ("value", "Value to match"),
        ("limit", "Max results, default 10"),
    ]),
    ("get_contact", "Get single Zoho Contact by Id.", [
        ("contact_id", "Zoho Contact ID"),
    ]),
    ("create_contact", "Create a Zoho Contact. Required: Last_Name.", [
        ("Last_Name", "REQUIRED — Last name"),
        ("First_Name", "First name"),
        ("Email", "Email"),
        ("Phone", "Phone"),
        ("Mobile", "Mobile"),
        ("Title", "Job title"),
        ("Account_Name", "Parent Account ID (19-digit)"),
        ("Mailing_City", "City"),
        ("Mailing_Country", "Country"),
        ("Description", "Notes"),
        ("custom_fields", "JSON string for custom fields"),
    ]),
    ("update_contact", "Update a Zoho Contact by Id.", [
        ("contact_id", "Zoho Contact ID"),
        ("First_Name", "First name"),
        ("Last_Name", "Last name"),
        ("Email", "Email"),
        ("Phone", "Phone"),
        ("Title", "Title"),
        ("Account_Name", "Parent Account ID"),
        ("Mailing_City", "City"),
        ("Mailing_Country", "Country"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("delete_contact", "Delete a Zoho Contact by Id (Soft-Delete, 60d).", [
        ("contact_id", "Zoho Contact ID"),
    ]),

    # Accounts (5 — no delete for safety)
    ("list_accounts", "List recent Zoho Accounts (companies). Returns all fields.", [
        ("limit", "Max results, default 10"),
    ]),
    ("search_accounts", "Search Zoho Accounts.", [
        ("word", "Full-text search"),
        ("field", "Field name (Account_Name, Industry, Website, Phone, ...)"),
        ("operator", "equals | starts_with | contains"),
        ("value", "Value to match"),
        ("limit", "Max results, default 10"),
    ]),
    ("get_account", "Get single Zoho Account by Id.", [
        ("account_id", "Zoho Account ID"),
    ]),
    ("create_account", "Create a Zoho Account. Required: Account_Name.", [
        ("Account_Name", "REQUIRED — Company name"),
        ("Phone", "Phone"),
        ("Website", "Website"),
        ("Industry", "Industry"),
        ("Billing_City", "City"),
        ("Billing_Country", "Country"),
        ("Employees", "Employee count (integer)"),
        ("Annual_Revenue", "Revenue (number)"),
        ("Description", "Notes"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("update_account", "Update a Zoho Account by Id. No delete — remove via Zoho UI for safety.", [
        ("account_id", "Zoho Account ID"),
        ("Account_Name", "Company name"),
        ("Phone", "Phone"),
        ("Website", "Website"),
        ("Industry", "Industry"),
        ("Billing_City", "City"),
        ("Billing_Country", "Country"),
        ("Employees", "Employee count"),
        ("Annual_Revenue", "Revenue"),
        ("custom_fields", "JSON custom fields"),
    ]),

    # Deals (5 — no delete for safety)
    ("list_deals", "List recent Zoho Deals. Returns all fields.", [
        ("limit", "Max results, default 10"),
    ]),
    ("search_deals", "Search Zoho Deals.", [
        ("word", "Full-text search"),
        ("field", "Field name (Deal_Name, Stage, Amount, Closing_Date, Account_Name, Owner, ...)"),
        ("operator", "equals | starts_with | contains"),
        ("value", "Value to match"),
        ("limit", "Max results, default 10"),
    ]),
    ("get_deal", "Get single Zoho Deal by Id.", [
        ("deal_id", "Zoho Deal ID"),
    ]),
    ("create_deal", "Create a Zoho Deal. Required: Deal_Name, Stage, Closing_Date.", [
        ("Deal_Name", "REQUIRED — Deal name"),
        ("Stage", "REQUIRED — Deal stage (e.g. Qualification, Negotiation/Review, Closed Won)"),
        ("Closing_Date", "REQUIRED — YYYY-MM-DD"),
        ("Amount", "Deal value (number)"),
        ("Account_Name", "Parent Account ID"),
        ("Contact_Name", "Primary Contact ID"),
        ("Probability", "Probability 0-100"),
        ("Type", "Type (New Business, Existing Business)"),
        ("Lead_Source", "Source"),
        ("Description", "Notes"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("update_deal", "Update a Zoho Deal by Id. No delete — remove via Zoho UI for safety.", [
        ("deal_id", "Zoho Deal ID"),
        ("Deal_Name", "Deal name"),
        ("Stage", "Stage"),
        ("Closing_Date", "Closing date YYYY-MM-DD"),
        ("Amount", "Amount"),
        ("Probability", "0-100"),
        ("Description", "Notes"),
        ("custom_fields", "JSON custom fields"),
    ]),

    # Tasks (5 — full CRUD)
    ("list_tasks", "List recent Zoho Tasks.", [
        ("limit", "Max results, default 10"),
    ]),
    ("get_task", "Get single Zoho Task by Id.", [
        ("task_id", "Zoho Task ID"),
    ]),
    ("create_task", "Create a Zoho Task. Required: Subject.", [
        ("Subject", "REQUIRED — Task subject"),
        ("Description", "Description"),
        ("Status", "Status (Not Started|In Progress|Completed|Deferred|Waiting for input)"),
        ("Priority", "Priority (High|Highest|Low|Lowest|Normal)"),
        ("Due_Date", "Due date YYYY-MM-DD"),
        ("What_Id", "Related Account/Deal ID"),
        ("Who_Id", "Related Contact/Lead ID"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("update_task", "Update a Zoho Task by Id — typically to mark it Completed.", [
        ("task_id", "Zoho Task ID"),
        ("Subject", "Task subject"),
        ("Status", "Not Started|In Progress|Completed|Deferred|Waiting for input"),
        ("Priority", "High|Highest|Low|Lowest|Normal"),
        ("Due_Date", "YYYY-MM-DD"),
        ("Description", "Description"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("delete_task", "Delete a Zoho Task by Id (Soft-Delete, 60d Recycle Bin).", [
        ("task_id", "Zoho Task ID"),
    ]),

    # Cases (4 — list, get, create, update; no delete for safety)
    ("list_cases", "List recent Zoho Cases (Service module).", [
        ("limit", "Max results, default 10"),
    ]),
    ("get_case", "Get single Zoho Case by Id.", [
        ("case_id", "Zoho Case ID"),
    ]),
    ("create_case", "Create a Zoho Case. Required: Subject, Status.", [
        ("Subject", "REQUIRED — Case subject"),
        ("Status", "REQUIRED — Status (New|On Hold|Closed|Escalated)"),
        ("Description", "Description"),
        ("Priority", "Priority (High|Low|Normal)"),
        ("Case_Origin", "Origin (Email|Phone|Web)"),
        ("Type", "Case type"),
        ("Account_Name", "Related Account ID"),
        ("Contact_Name", "Related Contact ID"),
        ("custom_fields", "JSON custom fields"),
    ]),
    ("update_case", "Update a Zoho Case by Id — typically to update Status or Description.", [
        ("case_id", "Zoho Case ID"),
        ("Subject", "Subject"),
        ("Status", "New|On Hold|Closed|Escalated"),
        ("Priority", "High|Low|Normal"),
        ("Description", "Description"),
        ("Case_Origin", "Email|Phone|Web"),
        ("custom_fields", "JSON custom fields"),
    ]),

    # Notes (2)
    ("list_notes", "List Notes attached to a record (any module). Notes are Zoho's record-level comments/activity log.", [
        ("parent_module", "REQUIRED — Module of the parent record (Leads|Contacts|Accounts|Deals|Tasks|Cases)"),
        ("parent_id", "REQUIRED — Record ID to list notes for"),
        ("limit", "Max results, default 10"),
    ]),
    ("create_note", "Attach a Note to any Zoho record. Common use: log an interaction, meeting outcome, or status update.", [
        ("parent_module", "REQUIRED — Module (Leads|Contacts|Accounts|Deals|Tasks|Cases)"),
        ("parent_id", "REQUIRED — Record ID"),
        ("Note_Title", "Short title (optional if Note_Content provided)"),
        ("Note_Content", "Note body text (optional if Note_Title provided)"),
    ]),

    # Users (1)
    ("list_users", "List Zoho CRM users (for Owner_ID picker / assignment). Default: ActiveUsers only.", [
        ("type", "Filter type: ActiveUsers | DeactiveUsers | ConfirmedUsers | NotConfirmedUsers | DeletedUsers | ActiveConfirmedUsers | AdminUsers | ActiveConfirmedAdmins | CurrentUser. Default: ActiveUsers"),
    ]),

    # Generic (2)
    ("coql_query", "Run raw COQL query (SQL-like). Requires WHERE clause.", [
        ("query", "Full COQL string, e.g. SELECT Last_Name, Email FROM Leads WHERE Last_Name is not null LIMIT 10. Uses Zoho api_names (Last_Name not lastname)."),
    ]),
    ("describe_module", "Get metadata for a Zoho module — list all fields incl. custom fields, types, picklist values. Use this first to discover custom field api_names.", [
        ("module_name", "Module name: Leads | Contacts | Accounts | Deals | Tasks | Cases | Products | Quotes | Vendors | Invoices (case-sensitive)"),
    ]),
]


def build_sub(js_code):
    return {
        "name": "MCP Sub: Zoho CRM",
        "settings": {
            "executionOrder": "v1",
            "callerPolicy": "workflowsFromSameOwner",
        },
        "nodes": [
            {
                "id": "sub-trigger",
                "name": "Execute Workflow Trigger",
                "type": "n8n-nodes-base.executeWorkflowTrigger",
                "typeVersion": 1.1,
                "position": [0, 0],
                "parameters": {"inputSource": "passthrough"},
            },
            {
                "id": "sub-code",
                "name": "Zoho CRM Logic",
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [256, 0],
                "parameters": {"jsCode": js_code},
            },
        ],
        "connections": {
            "Execute Workflow Trigger": {
                "main": [[{"node": "Zoho CRM Logic", "type": "main", "index": 0}]]
            }
        },
    }


def build_tool_node(idx, action, description, params):
    value = {"action": action}
    schema = [
        {
            "id": "action",
            "displayName": "action",
            "type": "string",
            "removed": False,
            "required": False,
            "description": "Action",
        }
    ]
    for (pname, pdesc) in params:
        value[pname] = "={{ $fromAI('" + pname + "', \"" + pdesc.replace('"', '\\"') + "\", 'string') }}"
        schema.append({
            "id": pname,
            "displayName": pname,
            "type": "string",
            "removed": False,
            "required": False,
            "description": pdesc,
        })

    col = idx % 6
    row = idx // 6
    return {
        "id": "t-" + action.replace("_", "-"),
        "name": action,
        "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
        "typeVersion": 2.2,
        "position": [col * 270, 300 + row * 250],
        "parameters": {
            "name": action,
            "description": description,
            "workflowId": {
                "__rl": True,
                "value": "REPLACE_SUB_WORKFLOW_ID",
                "mode": "id",
            },
            "workflowInputs": {
                "mappingMode": "defineBelow",
                "value": value,
                "matchingColumns": [],
                "schema": schema,
                "attemptToConvertTypes": False,
                "convertFieldsToString": True,
            },
        },
    }


def build_server():
    nodes = [
        {
            "id": "mcp-trigger",
            "name": "MCP Server Trigger",
            "type": "@n8n/n8n-nodes-langchain.mcpTrigger",
            "typeVersion": 2,
            "position": [0, 0],
            "parameters": {"path": "zoho-crm"},
        }
    ]
    connections = {}
    for idx, (action, desc, params) in enumerate(TOOLS):
        nodes.append(build_tool_node(idx, action, desc, params))
        connections[action] = {
            "ai_tool": [[{"node": "MCP Server Trigger", "type": "ai_tool", "index": 0}]]
        }

    return {
        "name": "MCP: Zoho CRM",
        "settings": {"executionOrder": "v1"},
        "nodes": nodes,
        "connections": connections,
    }


def main():
    with open(LOGIC_PATH, "r", encoding="utf-8") as f:
        js_code = f.read()

    bundle = {
        "format": "n8n-claw-template",
        "format_version": 1,
        "sub": build_sub(js_code),
        "server": build_server(),
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)

    print("Wrote " + OUT_PATH)
    print("Tools:", len(TOOLS))


if __name__ == "__main__":
    main()
