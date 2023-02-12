const { createServer } = require('node:http');
const { createReadStream } = require('node:fs');
const path = require('node:path');

const epoch = Date.now();

function doStatic(req, res, pathname) {
    let contentType;
    let filename;

    switch (pathname) {
        case '/index.html':
            contentType = 'text/html';
            filename = path.resolve(__dirname, 'www', 'index.html');
            break;
        case '/simulation.js':
            contentType = 'application/javascript';
            filename = path.resolve(__dirname, 'www', 'simulation.js');
            break;
        default: /* /logos/*.svg */
            let m = pathname.match(/^\/logos\/([0-9]+.svg)$/);
            contentType = 'image/svg+xml';
            filename = path.resolve(__dirname, 'www', 'logos', m[1]);
            break;
    }

    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=3600'
    });

    let reader = createReadStream(filename);
    reader.pipe(res);
}

function doTimer(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({ epoch, time: Date.now() }));
}

function do404(req, res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
}

let server = createServer((req, res) => {
    let url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;

    console.log(`${new Date().toISOString()} ${req.socket.remoteAddress} ${req.method} ${pathname}`);

    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
        return;
    }

    switch (pathname) {
        case '/':
            pathname = '/index.html';
        case '/index.html':
        case '/simulation.js':
            doStatic(req, res, pathname);
            break;
        case '/timer':
            doTimer(req, res);
            break;
        default:
            if (/^\/logos\/([0-9]+.svg)/.test(pathname)) {
                doStatic(req, res, pathname);
            } else {
                do404(req, res);
            }
            break;
    }
});

let args = process.argv.slice(2);
let port = 8000;
for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '-p') {
        port = parseInt(args[i+1], 10);
        break;
    }
}

server.on('clientError', (error, socket) => {
    if (error.code === 'ECONNRESET' || !socket.writable) {
        return;
    }

    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.log('Caught EADDRINUSE, exiting');
        process.exit(1);
    } else {
        console.log(error.stack);
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Listening on localhost port ${port}`);
});
