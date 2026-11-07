// Servidor estático mínimo, sem dependências. Uso: npm start  (ou: node scripts/serve.js [porta])
// Necessário porque módulos ES (import/export) não carregam a partir de file://.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('..', import.meta.url)));
const porta = Number(process.argv[2] || process.env.PORT || 8080);
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const servidor = http.createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';
    const arquivo = normalize(join(raiz, caminho));
    if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
      res.writeHead(403).end('Acesso negado');
      return;
    }
    const info = await stat(arquivo);
    if (!info.isFile()) throw new Error('não é arquivo');
    res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(arquivo));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 — não encontrado');
  }
});

servidor.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `Porta ${porta} em uso. Tente: node scripts/serve.js ${porta + 1}` : e.message);
  process.exit(1);
});
servidor.listen(porta, '127.0.0.1', () => {
  console.log(`Urna Lógica rodando em http://localhost:${porta}/  (Ctrl+C para parar)`);
});
