const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Safety Scrubber configuration
const SECRET_REGEX = /(?:api[_-]?key|token|secret)["']?\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi;
const GENERIC_TOKEN_REGEX = /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g; // JWT

function redactString(text) {
    if (typeof text !== 'string') return text;
    let scrubbed = text.replace(SECRET_REGEX, (match, p1) => {
        return match.replace(p1, '[REDACTED_SECRET]');
    });
    scrubbed = scrubbed.replace(GENERIC_TOKEN_REGEX, '[REDACTED_JWT]');
    return scrubbed;
}

function redactObject(obj) {
    if (typeof obj === 'string') return redactString(obj);
    if (Array.isArray(obj)) return obj.map(redactObject);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = redactObject(value);
        }
        return result;
    }
    return obj;
}

async function findLatestLogFile(logDir) {
    try {
        const stats = await fs.promises.stat(logDir);
        if (stats.isFile()) return logDir; // It's already a file

        const files = await fs.promises.readdir(logDir);
        const logFiles = [];

        for (const file of files) {
            const fullPath = path.join(logDir, file);
            const fileStat = await fs.promises.stat(fullPath);
            if (fileStat.isFile() && (file.endsWith('.log') || file.endsWith('.json') || file.endsWith('.jsonl'))) {
                logFiles.push({ path: fullPath, mtime: fileStat.mtime });
            } else if (fileStat.isDirectory()) {
                // Check one level deep for session folders
                const subFiles = await fs.promises.readdir(fullPath);
                for (const subFile of subFiles) {
                    const subFullPath = path.join(fullPath, subFile);
                    const subStat = await fs.promises.stat(subFullPath);
                    if (subStat.isFile() && (subFile.endsWith('.log') || subFile.endsWith('.json') || subFile.endsWith('.jsonl'))) {
                         logFiles.push({ path: subFullPath, mtime: subStat.mtime });
                    }
                }
            }
        }

        if (logFiles.length === 0) return null;
        logFiles.sort((a, b) => b.mtime - a.mtime);
        return logFiles[0].path;
    } catch (e) {
        console.error(`Error finding log files in ${logDir}:`, e.message);
        return null;
    }
}

async function parseLogFile(filePath, redact) {
    const events = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const parsed = JSON.parse(line);
            
            // Check for specific event types (adjust according to actual log format)
            // Typically Claude/Antigravity logs might look like this:
            let eventType = 'unknown';
            let content = null;
            let metadata = {};

            // Heuristics to identify block types
            if (parsed.type === 'thought' || parsed.thinking || (parsed.content && parsed.content.includes('<thought>')) || parsed.message?.includes('thought')) {
                 eventType = 'thinking';
                 content = parsed.thinking || parsed.content || parsed.message || JSON.stringify(parsed);
            } else if (parsed.type === 'tool_use' || parsed.tool_call || parsed.function_call) {
                 eventType = 'tool_use';
                 content = parsed.tool_use || parsed.tool_call || parsed.function_call || JSON.stringify(parsed);
            } else if (parsed.type === 'tool_result' || parsed.tool_output) {
                 eventType = 'tool_result';
                 content = parsed.tool_result || parsed.tool_output || JSON.stringify(parsed);
            } else {
                 eventType = 'raw';
                 content = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
            }

            let entry = {
                timestamp: parsed.timestamp || new Date().toISOString(),
                type: eventType,
                content: content,
                raw: parsed
            };

            if (redact) {
                entry = redactObject(entry);
            }

            events.push(entry);

        } catch (e) {
            // Not JSON or parse error, treat as raw string
            let entry = {
                timestamp: new Date().toISOString(),
                type: 'raw',
                content: line
            };
            if (redact) {
                entry.content = redactString(entry.content);
            }
            events.push(entry);
        }
    }
    return events;
}

function generateHTML(events, metadata) {
    const htmlHeader = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Replay Artifact - ${metadata.sessionId}</title>
    <style>
        :root {
            --bg-color: #1e1e1e;
            --text-color: #d4d4d4;
            --secondary-bg: #2d2d2d;
            --border-color: #404040;
            --accent-color: #007acc;
            --thinking-color: #b5cea8;
            --tool-color: #ce9178;
            --result-color: #4ec9b0;
            --font-family: 'Consolas', 'Courier New', monospace;
        }
        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-family);
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }
        .header {
            background-color: var(--secondary-bg);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 1.5em;
            color: var(--accent-color);
        }
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 0.9em;
        }
        .metadata-item span {
            color: #808080;
        }
        .log-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .log-entry {
            background-color: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        .entry-header {
            padding: 10px 15px;
            background-color: rgba(0,0,0,0.2);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }
        .entry-type-thinking { color: var(--thinking-color); }
        .entry-type-tool_use { color: var(--tool-color); }
        .entry-type-tool_result { color: var(--result-color); }
        .entry-type-raw { color: #808080; }
        
        .entry-content {
            padding: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 0.9em;
        }
        
        details {
            padding: 10px 15px;
        }
        summary {
            cursor: pointer;
            color: var(--accent-color);
            font-weight: bold;
            outline: none;
        }
        summary:hover {
            text-decoration: underline;
        }
        .raw-data {
            background-color: #111;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            overflow-x: auto;
        }
        .badge-redacted {
            background-color: #d16969;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Antigravity Session Replay</h1>
        <div class="metadata-grid">
            <div class="metadata-item"><span>Session ID:</span> ${metadata.sessionId}</div>
            <div class="metadata-item"><span>Executed At:</span> ${metadata.date}</div>
            <div class="metadata-item"><span>Events Parsed:</span> ${events.length}</div>
            <div class="metadata-item"><span>Redaction:</span> ${metadata.redacted ? '<span style="color:#4ec9b0">Enabled</span>' : '<span style="color:#d16969">Disabled</span>'}</div>
        </div>
    </div>
    <div class="log-container">
`;

    const htmlEvents = events.map(e => {
        let contentHtml = '';
        if (typeof e.content === 'object') {
            contentHtml = JSON.stringify(e.content, null, 2);
        } else {
            contentHtml = String(e.content).replace(/</g, '<').replace(/>/g, '>');
        }
        
        return `
        <div class="log-entry">
            <div class="entry-header">
                <span class="entry-type-${e.type}">${e.type.toUpperCase()} ${metadata.redacted && contentHtml.includes('REDACTED') ? '<span class="badge-redacted">REDACTED</span>' : ''}</span>
                <span style="color: #808080; font-size: 0.8em;">${new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
            ${e.type === 'tool_result' ? `
            <details>
                <summary>View Tool Output</summary>
                <div class="entry-content">${contentHtml}</div>
            </details>
            ` : `
            <div class="entry-content">${contentHtml}</div>
            `}
            <details>
                <summary>Raw JSON</summary>
                <pre class="raw-data">${JSON.stringify(e.raw, null, 2)}</pre>
            </details>
        </div>
        `;
    }).join('\n');

    const htmlFooter = `
    </div>
</body>
</html>
`;
    return htmlHeader + htmlEvents + htmlFooter;
}

async function main() {
    const args = process.argv.slice(2);
    let logDir = null;
    let redact = false;
    let outputPath = path.join(process.cwd(), 'log-replay.html');

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--path') {
            logDir = args[i+1];
            i++;
        } else if (args[i] === '--redact') {
            redact = true;
        } else if (args[i] === '--out') {
            outputPath = args[i+1];
            i++;
        }
    }

    if (!logDir) {
        console.error('Error: Please provide a log directory or file using --path');
        process.exit(1);
    }

    console.log(`Searching for latest log in: ${logDir}`);
    const latestLog = await findLatestLogFile(logDir);

    if (!latestLog) {
        console.error(`Error: No valid log files found in ${logDir}`);
        process.exit(1);
    }

    console.log(`Parsing log file: ${latestLog}`);
    if (redact) console.log(`Redaction is ENABLED`);

    const events = await parseLogFile(latestLog, redact);
    
    const sessionId = path.basename(latestLog, path.extname(latestLog));
    const metadata = {
        sessionId: sessionId,
        date: new Date().toLocaleString(),
        redacted: redact
    };

    const htmlOutput = generateHTML(events, metadata);
    fs.writeFileSync(outputPath, htmlOutput);

    console.log(`\nSuccess! Replay artifact generated at: ${outputPath}`);
}

main().catch(console.error);
