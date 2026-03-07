# n8n-claw Templates

Template catalog for [n8n-claw](https://github.com/freddy-schuetz/n8n-claw) MCP servers.

## Usage

Templates are installed via the n8n-claw Library Manager (chat command):

```
"Show me available templates"
"Install weather-openmeteo"
"Remove weather-openmeteo"
```

## Template Types

| Type | Description |
|------|-------------|
| `native` | n8n implements the tool logic (HTTP/Code nodes) |
| `bridge` | n8n proxies to an external MCP server |

## CDN

Templates are served via jsDelivr:

```
https://cdn.jsdelivr.net/gh/freddy-schuetz/n8n-claw-templates@master/templates/index.json
```

## Contributing

1. Create a directory under `templates/` with your template ID
2. Add `manifest.json` and `workflow.json`
3. Add an entry to `templates/index.json`
4. Submit a pull request

## License

MIT
