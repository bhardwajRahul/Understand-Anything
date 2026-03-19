# Installing Understand-Anything for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add understand-anything to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["understand-anything@git+https://github.com/Lum1104/Understand-Anything.git"]
}
```

Restart OpenCode. The plugin auto-installs and registers all skills.

## Verify

Ask: "List available skills" — you should see understand, understand-chat, understand-dashboard, etc.

## Usage

```
use skill tool to load understand-anything/understand
```

Or just ask: "Analyze this codebase and build a knowledge graph"

## Updating

Restart OpenCode — the plugin re-installs from git automatically.

## Uninstalling

Remove the plugin line from `opencode.json` and restart.
