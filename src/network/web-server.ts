import path from 'path';
import fs from 'fs';
import {message, isValidUUID, close} from './socket';
import {Logger} from '../util/logger';

const mimeTypes: {[key: string]: string} = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
};

function GetMimeType(file: string) {
    let ext = path.extname(file).toLowerCase();
    if (ext.startsWith('.')) ext = ext.slice(1);
    return mimeTypes[ext as keyof typeof mimeTypes] || 'application/octet-stream';
}

export function Listen(port: number, cb: () => void) {
    if (typeof Bun !== 'undefined') {
        Bun.serve<string>({
            port,
            development: true,
            fetch(req, server) {
                const uuid = new URL(req.url).searchParams.get('uuid');
                if (
                    uuid &&
                    server.upgrade(req, {
                        data: uuid,
                    })
                ) {
                    return undefined;
                }

                const url = new URL(req.url);

                const file = url.pathname.slice(1);

                const filePath = path.resolve('./client/dist', file.split(/[\?#]/)[0] === '' ? 'index.html' : file);

                try {
                    const stat = fs.statSync(filePath);

                    if (stat.isFile()) {
                        return new Response(Bun.file(filePath));
                    } else {
                        return new Response('Not a file', {status: 404});
                    }
                } catch (error) {
                    return new Response('File not found', {status: 404});
                }
            },
            websocket: {
                open(ws) {},
                message(ws, msg) {
                    if (typeof msg === 'string') {
                        ws.send('Please give me a buffer instead of a string!');

                        return;
                    }

                    if (ws.data !== '0' && !isValidUUID(ws.data)) {
                        ws.send('Please give me a normal uuid!');

                        return;
                    }

                    message(ws.data, new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength / Uint8Array.BYTES_PER_ELEMENT), (msg: Uint8Array | string) => ws.send(msg));
                },
                close(ws) {
                    close(ws.data);
                },
            },
        });

        cb();
    } else {
        import('uWebSockets.js').then((uWS) =>
            uWS
                .App()
                .ws('/*', {
                    message: (ws, msg, isBinary) => {
                        if (!isBinary) {
                            ws.send('Please give me a buffer instead of a string!', true);
                            return;
                        }

                        const data = (ws.getUserData() as {uuid: string}).uuid;

                        if (!isValidUUID(data)) {
                            ws.send('Please give me a valid UUID!', true);
                            return;
                        }

                        const uint8Array = new Uint8Array(msg);
                        message(data, uint8Array, (msg: Uint8Array | string) => {
                            ws.send(msg, typeof msg === 'string' ? false : true);
                        });
                    },
                    open: (ws) => {
                        ws.send('w');
                    },
                    close: (ws) => {
                        const data = (ws.getUserData() as {uuid: string}).uuid;

                        close(data);
                    },
                    upgrade: (res, req, context) => {
                        const uuid = req.getQuery('uuid');
                        if (uuid === '0' || isValidUUID(uuid)) {
                            res.upgrade({uuid}, req.getHeader('sec-websocket-key'), req.getHeader('sec-websocket-protocol'), req.getHeader('sec-websocket-extensions'), context);
                        } else {
                            res.writeStatus('400 Bad Request').end('Invalid UUID');
                        }
                    },
                })
                .get('/*', (res, req) => {
                    return new Promise((r) => {
                        res.onAborted(() => {
                            res.aborted = true;
                        });

                        const urlPath = req.getUrl();
                        const file = urlPath.slice(1);
                        const filePath = path.resolve('./client/dist', file.split(/[\?#]/)[0] === '' ? 'index.html' : file);

                        fs.readFile(filePath, (err, data) => {
                            res.cork(() => {
                                if (err) {
                                    res.writeStatus('404 Not Found').end('File not found');
                                } else {
                                    const mimeType = GetMimeType(filePath);
                                    res.writeHeader('Content-Type', mimeType).end(data);
                                }
                            });
                        });
                    });
                })
                .listen(port, (token: any) => {
                    if (token) {
                        cb();
                    } else {
                        Logger.error('Failed to open server!');
                    }
                }),
        );
    }
}
