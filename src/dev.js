import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), `.env.default`) });

import http from 'http';
import { run } from './run.js';
import { parseQuery } from './utils/query.js';

const DEV_PORT = process.env.DEV_PORT || 8080;
const HELIX_RUN_QUERY_DOMAIN_KEY = process.env.HELIX_RUN_QUERY_DOMAIN_KEY || '';

http.createServer(async function (req, res) {
    var query = '';
    req.on('readable', function() {
        const readPayload = req.read();
        if (readPayload) {
            query += readPayload;
        }
    });
    req.on('end', async () => {
        const context = {
            env: {
                HELIX_RUN_QUERY_DOMAIN_KEY,
            },
            data: JSON.stringify(parseQuery(query))
        };

        const request = {
            url: req.headers.host + req.url,
            method: req.method,
            headers: req.headers,
            query
        };

        const response = await run(request, context);
        const resolved = await response?.text();
    
        res.writeHead(response['status'], response['headers']);
        res.end(JSON.stringify(resolved));
    });
  }).listen(DEV_PORT, 'localhost', () => {
    console.log(`Server is running on http://localhost:${DEV_PORT}`);
});

