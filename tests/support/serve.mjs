// Test utility only. Production is served directly by EdgeOne Makers.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const config = JSON.parse(await readFile('edgeone.json', 'utf8'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  for (const rule of config.redirects) {
    const prefix = rule.source.replace(/\*$/, '');
    if (
      url.pathname === prefix ||
      (rule.source.endsWith('*') && url.pathname.startsWith(prefix))
    ) {
      res.writeHead(rule.statusCode, { location: rule.destination });
      res.end();
      return;
    }
  }
  let file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  let status = 200;
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    await stat(file);
  } catch {
    file = resolve(root, '404.html');
    status = 404;
  }
  try {
    res.writeHead(status, {
      'content-type': types[extname(file)] || 'application/octet-stream',
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end('Build output missing');
  }
}).listen(4371, '127.0.0.1');
