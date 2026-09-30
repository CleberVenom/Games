// Preenche o ID do Deezer das músicas de musicas.js que ainda não têm um,
// e confere se todas as músicas têm prévia de 30 s disponível.
//
//   node scripts/deezer.mjs            # busca IDs que faltam e grava musicas.js
//   node scripts/deezer.mjs --conferir # só confere as prévias, não grava nada
//
// Prefere a gravação de estúdio; se o Deezer só tiver versões ao vivo/acústicas, usa uma delas.
// Confira o resultado impresso: a busca pode escolher a faixa errada. Nesse caso, ponha o ID
// certo à mão (o número no fim do link https://www.deezer.com/track/<ID>).
import fs from 'node:fs';

const ARQUIVO = new URL('../musicas.js', import.meta.url);
const PREFIXO = 'window.MUSICAS = ';

const texto = fs.readFileSync(ARQUIVO, 'utf8');
const inicio = texto.indexOf(PREFIXO) + PREFIXO.length;
const cabecalho = texto.slice(0, inicio);
const musicas = JSON.parse(texto.slice(inicio).trim().replace(/;$/, ''));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(caminho) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://api.deezer.com/${caminho}`).catch(() => null);
    const d = r?.ok ? await r.json() : null;
    if (d && !d.error) return d;
    await espera(1500 * (i + 1));
  }
  throw new Error(`Deezer não respondeu: ${caminho}`);
}

const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/&/g, ' e ').replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\b(e|os|o|a|as|mc)\b/g, ' ').replace(/\s+/g, ' ').trim();
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const RUIM = /karaoke|instrumental|playback|cover|tributo|homenagem|remix|\bmix\b|in the style|made popular|para bebes|rock your babies/i;
const AO_VIVO = /ao vivo|\blive\b|acustic|acoustic|mtv|ensaio|session/i;
const anoIsrc = (isrc) => (isrc ? (+isrc.slice(5, 7) > 40 ? 1900 : 2000) + +isrc.slice(5, 7) : 9999);

async function buscar(m) {
  const q = `${m.artista} ${m.musica.replace(/\(.*?\)/g, '')}`.replace(/[!.,'"]/g, ' ');
  const r = await api(`search?q=${encodeURIComponent(q)}&limit=50`);
  const artista = normal(m.artista);
  const titulo = normal(m.musica);
  const ok = r.data.filter((t) => {
    const a = normal(t.artist.name);
    const tt = normal(t.title_short || t.title);
    const nome = semAcento(`${t.title} ${t.title_version || ''} ${t.album.title}`);
    return (a.includes(artista) || artista.includes(a)) &&
      (tt === titulo || tt.startsWith(titulo) || titulo.startsWith(tt)) && !RUIM.test(nome);
  });
  const vivo = (t) => AO_VIVO.test(semAcento(`${t.title} ${t.title_version || ''} ${t.album.title}`));
  // Estúdio primeiro; entre as candidatas, a de ISRC mais antigo (mais perto da gravação original).
  ok.sort((x, y) => vivo(x) - vivo(y) || anoIsrc(x.isrc) - anoIsrc(y.isrc) || y.rank - x.rank);
  return ok[0];
}

const conferir = process.argv.includes('--conferir');
let problemas = 0;
for (const m of musicas) {
  if (!m.deezer && !conferir) {
    const t = await buscar(m);
    if (t) {
      m.deezer = t.id;
      console.log(`+ ${m.artista} - ${m.musica}  ->  ${t.artist.name} - ${t.title} [${t.album.title}] (${t.id})`);
    } else {
      console.log(`? ${m.artista} - ${m.musica}: não encontrada no Deezer`);
      problemas++;
    }
    await espera(150);
  }
  if (m.deezer) {
    const t = await api(`track/${m.deezer}`);
    if (!t.readable || !t.preview) {
      console.log(`! ${m.artista} - ${m.musica}: faixa ${m.deezer} sem prévia`);
      problemas++;
    }
    await espera(150);
  }
}
if (!conferir) fs.writeFileSync(ARQUIVO, cabecalho + JSON.stringify(musicas, null, 0).replace(/\},\{/g, '},\n{') + ';\n');
console.log(problemas ? `${problemas} problema(s).` : 'Tudo certo.');
process.exitCode = problemas ? 1 : 0;
