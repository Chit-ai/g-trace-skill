---
name: g-trace
description: Analyzes Antigravity logs to create interactive session replays and redaction reports.
---

# G-Trace Skill

## Overview
This skill allows Antigravity to parse its own session logs and generate a self-contained HTML replay artifact. This artifact visualizes the agent's internal monologue (thinking blocks), tool usage, and results in a terminal-style UI, while ensuring sensitive credentials are automatically redacted.

## Capabilities
1. **Parse Session Logs**: Extracts structured events from `.antigravity/logs/`.
2. **Redact Sensitive Info**: Applies a safety scrubber to remove API keys and tokens before visualization.
3. **Generate Replay UI**: Produces a responsive, dark-mode terminal HTML file for review.
