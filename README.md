# G-Trace

[![Build Status](https://github.com/Chit-ai/g-trace-skill/actions/workflows/g-trace-build.yml/badge.svg)](https://github.com/Chit-ai/g-trace-skill/actions/workflows/g-trace-build.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)

**G-Trace** is a powerful logging and replay skill designed for the Antigravity Agent framework. It parses local Antigravity session logs, redacts sensitive information, and generates a beautiful, interactive, dark-mode terminal HTML artifact for seamless debugging and review.

---

## 🚀 Features

*   **Intelligent Parsing**: Automatically identifies and extracts agent `thought` processes, `tool_use` definitions, and `tool_result` outputs from JSON/JSONL log streams.
*   **Built-in Safety Scrubber**: Automatically detects and redacts sensitive API keys and JWT tokens to prevent accidental exposure in your replay artifacts.
*   **Interactive HTML UI**: Generates a self-contained HTML file featuring a responsive dark-mode aesthetic with collapsible JSON data blocks.
*   **Zero Dependencies**: The logic engine runs on pure Node.js standard libraries.

## 📦 Installation

To install this skill in your local Antigravity environment, clone this repository directly into your agent's skills directory:

```bash
# Navigate to your Antigravity skills directory
cd /path/to/your/project/.agent/skills/

# Clone the repository
git clone https://github.com/Chit-ai/g-trace-skill.git g-trace
```

Antigravity will automatically detect `g-trace/SKILL.md` and make its capabilities available to the agent.

## 🛠️ Usage

G-Trace can be executed in two main ways:

### 1. Agent Invocation (Recommended)
Simply ask Antigravity to analyze your logs:
> *"Hey Antigravity, use the g-trace skill to analyze my last session logs and generate a replay."*

### 2. Manual CLI Execution
You can run the script manually against any Antigravity-formatted `.log`, `.json`, or `.jsonl` file or directory.

```bash
cd .agent/skills/g-trace

# Run against a specific file with redaction enabled
node index.js --path /path/to/logfile.jsonl --redact

# Run against a directory (automatically finds the newest log)
node index.js --path /path/to/logs/dir --redact --out custom-replay.html
```

#### CLI Arguments:
*   `--path <path>`: **(Required)** The file or directory containing the Antigravity logs.
*   `--redact`: **(Optional)** Enables the safety scrubber to mask API keys and JWTs.
*   `--out <path>`: **(Optional)** Specifies the output path for the HTML artifact. Defaults to `./log-replay.html`.

## 🧪 Testing

To verify the core regex engine's ability to identify and redact sensitive tokens:

```bash
npm run test
```
This runs the internal `test_regex.js` suite to ensure `[REDACTED_SECRET]` masking works correctly.

## 🏗️ Technical Architecture

G-Trace consists of three primary components:
1.  **`SKILL.md`**: The metadata definition file that Antigravity reads to understand how to interact with the skill.
2.  **`index.js`**: The core Node.js logic engine. It handles file I/O, regex scrubbing, JSON parsing, and HTML generation.
3.  **UI Template**: Embedded within `index.js`, the HTML generator outputs CSS-styled accordions (`<details>`) to cleanly separate metadata, human-readable summaries, and raw JSON data dumps.

## 📄 License

ISC License. See `package.json` for details.
