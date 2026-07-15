# dingdawg-test-agent

Validate your AI agent before publishing to the DingDawg Governed Agent Marketplace.

## Usage

```bash
# Run from your agent directory
npx dingdawg-test-agent

# Or specify a path
npx dingdawg-test-agent ./my-agent
```

## What it checks

| Check | Description |
|-------|-------------|
| Manifest | manifest.json or package.json exists |
| Required fields | name, description, category, framework |
| Category | Valid marketplace category |
| Framework | Supported framework (MCP, OpenClaw, NemoClaw, LangChain, CrewAI, custom) |
| Governance | Governance policies declared |
| MCP tools | At least one tool defined |
| README | README.md exists |
| Entry point | main or bin field points to valid file |

## Creating an agent

```bash
npx create-dingdawg-agent
```

## Publishing

After all tests pass:

```bash
npx dingdawg-publish-agent
```

## Get an API key

Sign up at [dingdawg.com/developers](https://dingdawg.com/developers) to get your marketplace API key.

## Support

- Email: support@dingdawg.com
- Docs: [dingdawg.com/marketplace](https://dingdawg.com/marketplace)
