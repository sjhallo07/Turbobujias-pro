import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);

function printHelp() {
    console.log(`Turbobujias unified startup

Usage:
  node scripts/dev-stack.mjs [--chatbot remote|local] [--only backend|frontend|chatbot]

Examples:
  node scripts/dev-stack.mjs
  node scripts/dev-stack.mjs --chatbot local
  node scripts/dev-stack.mjs --only backend
  node scripts/dev-stack.mjs --only chatbot --chatbot local
`);
}

function parseArgs(argv) {
    const options = {
        chatbot: 'remote',
        only: null,
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--help' || value === '-h') {
            options.help = true;
            continue;
        }

        if (value === '--chatbot') {
            options.chatbot = argv[index + 1] || '';
            index += 1;
            continue;
        }

        if (value === '--only') {
            options.only = argv[index + 1] || '';
            index += 1;
            continue;
        }

        throw new Error(`Unknown argument: ${value}`);
    }

    if (!['remote', 'local'].includes(options.chatbot)) {
        throw new Error(`Invalid --chatbot value: ${options.chatbot}`);
    }

    if (options.only && !['backend', 'frontend', 'chatbot'].includes(options.only)) {
        throw new Error(`Invalid --only value: ${options.only}`);
    }

    if (options.only === 'chatbot' && options.chatbot !== 'local') {
        throw new Error('`--only chatbot` requires `--chatbot local`.');
    }

    return options;
}

function resolveChatbotPython() {
    const candidates = [
        path.join(repoRoot, 'turbobujias-ai', '.venv313', 'Scripts', 'python.exe'),
        path.join(repoRoot, 'turbobujias-ai', '.venv', 'Scripts', 'python.exe'),
        path.join(repoRoot, 'turbobujias-ai', '.venv313', 'bin', 'python'),
        path.join(repoRoot, 'turbobujias-ai', '.venv', 'bin', 'python'),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function prefixStream(stream, prefix, target) {
    if (!stream) {
        return;
    }

    let buffer = '';
    stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line) {
                continue;
            }
            target.write(`[${prefix}] ${line}\n`);
        }
    });

    stream.on('end', () => {
        if (buffer) {
            target.write(`[${prefix}] ${buffer}\n`);
            buffer = '';
        }
    });
}

function spawnService(name, command, commandArgs, options) {
    const child = spawn(command, commandArgs, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: false,
    });

    prefixStream(child.stdout, name, process.stdout);
    prefixStream(child.stderr, `${name}:err`, process.stderr);

    return child;
}

function buildServices(options) {
    const backendPort = process.env.BACKEND_PORT || '3001';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const chatbotPort = process.env.CHATBOT_PORT || '7860';
    const remoteChatbotUrl =
        process.env.HF_SPACE_URL ||
        process.env.NEXT_PUBLIC_HF_SPACE_URL ||
        'https://sjhallo07-turbobujias-ai.hf.space';
    const chatbotUrl =
        options.chatbot === 'local' ? `http://127.0.0.1:${chatbotPort}` : remoteChatbotUrl;

    const baseEnv = {
        ...process.env,
        PATH: process.env.PATH || '',
    };

    const services = [];

    if (!options.only || options.only === 'backend') {
        services.push({
            name: 'backend',
            command: npmCommand,
            args: ['--prefix', 'backend', 'run', 'start'],
            cwd: repoRoot,
            env: {
                ...baseEnv,
                PORT: backendPort,
            },
        });
    }

    if (!options.only || options.only === 'frontend') {
        services.push({
            name: 'frontend',
            command: npmCommand,
            args: ['--prefix', 'turbobujias-web', 'run', 'dev'],
            cwd: repoRoot,
            env: {
                ...baseEnv,
                PORT: frontendPort,
                NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${backendPort}/api`,
                HF_SPACE_URL: chatbotUrl,
                NEXT_PUBLIC_HF_SPACE_URL: chatbotUrl,
                NEXT_PUBLIC_HF_CHAT_API_NAME: process.env.NEXT_PUBLIC_HF_CHAT_API_NAME || '/chat',
            },
        });
    }

    if ((!options.only || options.only === 'chatbot') && options.chatbot === 'local') {
        const pythonExecutable = resolveChatbotPython();
        if (!pythonExecutable) {
            throw new Error(
                'No local chatbot virtual environment was found. Create turbobujias-ai/.venv313 or turbobujias-ai/.venv first.'
            );
        }

        services.push({
            name: 'chatbot',
            command: pythonExecutable,
            args: ['app.py'],
            cwd: path.join(repoRoot, 'turbobujias-ai'),
            env: {
                ...baseEnv,
                PORT: chatbotPort,
            },
        });
    }

    return { services, backendPort, frontendPort, chatbotPort, chatbotUrl };
}

let stopping = false;
const children = new Set();

function stopChildren(exitCode = 0) {
    if (stopping) {
        return;
    }

    stopping = true;
    for (const child of children) {
        try {
            child.kill('SIGTERM');
        } catch {
            // ignore
        }
    }

    setTimeout(() => process.exit(exitCode), 100);
}

async function main() {
    const options = parseArgs(args);
    if (options.help) {
        printHelp();
        return;
    }

    const { services, backendPort, frontendPort, chatbotPort, chatbotUrl } = buildServices(options);
    console.log(`[stack] starting ${services.map((service) => service.name).join(', ')}`);
    console.log(`[stack] backend:  http://127.0.0.1:${backendPort}`);
    console.log(`[stack] frontend: http://127.0.0.1:${frontendPort}`);
    console.log(`[stack] chatbot:  ${options.chatbot === 'local' ? `http://127.0.0.1:${chatbotPort}` : chatbotUrl}`);

    for (const service of services) {
        const child = spawnService(service.name, service.command, service.args, {
            cwd: service.cwd,
            env: service.env,
        });
        children.add(child);

        child.on('exit', (code, signal) => {
            if (stopping) {
                return;
            }

            const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
            console.error(`[stack] ${service.name} exited with ${detail}`);
            stopChildren(code ?? 1);
        });
    }

    process.on('SIGINT', () => stopChildren(0));
    process.on('SIGTERM', () => stopChildren(0));
}

main().catch((error) => {
    console.error(`[stack] ${error.message}`);
    process.exit(1);
});
