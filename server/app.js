const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const STORAGE_DIR = path.join(__dirname, '../storage');

// Helper: Ensure storage dir exists
const ensureStorageDir = () => {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
};

// Helper: CORS Headers
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Health Check
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Vanilla Node Server Running' }));
        return;
    }

    // Storage API: /api/storage/:key
    const storageMatch = pathname.match(/^\/api\/storage\/([\w-]+)$/);
    if (storageMatch) {
        const key = storageMatch[1];
        const filePath = path.join(STORAGE_DIR, `${key}.json`);

        if (req.method === 'GET') {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end('null');
                    } else {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'Read error' }));
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                }
            });
            return;
        }

        if (req.method === 'POST') {
            ensureStorageDir();
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    // Validate JSON
                    const json = JSON.parse(body); // Just to check validity
                    
                    fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
                        if (err) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: 'Write error' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, timestamp: new Date() }));
                        }
                    });
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
    }

    // Static Files (Frontend)
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    
    // Remove leading slash/backslash to ensure path.join works as relative
    safePath = safePath.replace(/^[\/\\]/, '');

    const fileLoc = path.join(__dirname, '../', safePath);
    
    // Debug logging (will show in terminal)
    console.log(`Request: ${pathname} -> Serving: ${fileLoc}`);

    fs.stat(fileLoc, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(fileLoc);
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.gif': 'image/gif',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(fileLoc).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
});

server.listen(PORT, () => {
    console.log(`ZERO-DEPENDENCY Server running at http://localhost:${PORT}`);
    console.log(`Storage endpoint: http://localhost:${PORT}/api/storage/KEY`);
});
