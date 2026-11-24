import {
    spawn,
    type ChildProcessWithoutNullStreams
} from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import {
    WebSocket,
    WebSocketServer
} from 'ws';

import type { CodexCommand } from './command';
import type { CodexTelemetry } from './telemetry';

export async function startBridge(command: CodexCommand, telemetry: CodexTelemetry) {
    // Use an authenticated loopback endpoint. The app server itself only sees stdio.
    const token = randomBytes(32).toString('hex');
    const server = createServer((_req, res) => { res.writeHead(404).end(); });
    const sockets = new WebSocketServer({ noServer: true });
    let peer: WebSocket | undefined;
    let backend: ChildProcessWithoutNullStreams | undefined;

    server.on('upgrade', (request, socket, head) => {
        if (peer || request.headers.authorization !== `Bearer ${token}`) {
            socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
            return;
        }
        sockets.handleUpgrade(request, socket, head, (client) => {
            peer = client;
            const child = spawn(command.file, [...command.args, 'app-server', '--listen', 'stdio://'], { windowsHide: true });
            backend = child;
            child.stderr.resume();
            child.stdin.on('error', () => { client.close(1011, 'Codex app-server input closed'); });
            child.on('error', () => { client.close(1011, 'Could not start Codex app-server'); });
            child.on('exit', () => { client.close(1011, 'Codex app-server exited'); });
            const lines = createInterface({ input: child.stdout });
            lines.on('line', (line) => {
                telemetry.response(line);
                if (client.readyState === WebSocket.OPEN)
                    client.send(line);
            });
            client.on('message', (data, binary) => {
                if (binary || !Buffer.isBuffer(data)) {
                    client.close(1003, 'Expected a text frame');
                    return;
                }
                const line = data.toString('utf8');
                if (/[\r\n]/.test(line)) {
                    client.close(1003, 'Expected one JSON-RPC message per frame');
                    return;
                }
                telemetry.request(line);
                child.stdin.write(line + '\n');
            });
            client.on('error', () => { client.terminate(); });
            client.once('close', () => {
                lines.close();
                child.stdin.end();
            });
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            server.off('error', reject);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === 'string')
        throw new Error('No local address for the Codex app-server');

    return {
        url: `ws://127.0.0.1:${address.port}`,
        token,
        async close() {
            peer?.terminate();
            backend?.stdin.end();
            sockets.close();
            server.close();
            const child = backend;
            if (child?.pid && child.exitCode === null && child.signalCode === null) {
                // Give app-server a chance to flush its thread files.
                await new Promise<void>((resolve) => {
                    const forceClose = setTimeout(() => {
                        child.kill();
                        resolve();
                    }, 5000);
                    child.once('exit', () => {
                        clearTimeout(forceClose);
                        resolve();
                    });
                });
            }
        }
    };
}
