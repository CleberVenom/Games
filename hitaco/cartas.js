'use strict';
// Monta as folhas A4 para impressão: frente (QR code) e verso (ano, artista e música),
// com o verso espelhado para bater certinho na impressão frente e verso pela borda longa.

const PADRAO = 'https://clebervenom.github.io/Games/hitaco/';
const COLUNAS = 3;
const LINHAS = 4;
const CARTA = 64; // mm
const ESTILOS = { rock: 'Rock nacional', funk: 'Funk', sertanejo: 'Sertanejo raiz', universitario: 'Sertanejo universitário' };
const FICHAS_POR_FOLHA = 70;

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const num = (n) => String(n).padStart(3, '0');

function baseInicial() {
  const pedida = new URLSearchParams(location.search).get('base');
  if (pedida) return pedida;
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  return local ? PADRAO : location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
}

function qr(texto) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 1, margin: 0, scalable: true });
}

// Tamanho do texto conforme o comprimento, para nomes longos caberem na carta.
const tamanho = (s, limites) => limites.findIndex((l) => s.length <= l) + 1 || limites.length + 1;

function frente(m, base) {
  return `<div class="carta frente">
    <span class="logo">Hita<span>ç</span>o</span>
    <div class="qr">${qr(`${base}#c=${m.n}`)}</div>
    <span class="num">nº ${num(m.n)}</span>
  </div>`;
}

function verso(m) {
  return `<div class="carta verso ${m.estilo}">
    <p class="artista t${tamanho(m.artista, [18, 26, 40])}">${esc(m.artista)}</p>
    <p class="ano">${m.ano}</p>
    <p class="musica t${tamanho(m.musica, [20, 34, 52])}">${esc(m.musica)}</p>
    <span class="rodape">${ESTILOS[m.estilo]} · nº ${num(m.n)}</span>
  </div>`;
}

// Marcas de corte nas margens da folha.
function marcas() {
  const x0 = (210 - COLUNAS * CARTA) / 2;
  const y0 = (297 - LINHAS * CARTA) / 2;
  let h = '';
  for (let c = 0; c <= COLUNAS; c++) {
    const x = x0 + c * CARTA;
    h += `<i class="marca v" style="left:${x}mm;top:0;height:${y0 - 2}mm"></i>`;
    h += `<i class="marca v" style="left:${x}mm;bottom:0;height:${y0 - 2}mm"></i>`;
  }
  for (let l = 0; l <= LINHAS; l++) {
    const y = y0 + l * CARTA;
    h += `<i class="marca h" style="top:${y}mm;left:0;width:${x0 - 2}mm"></i>`;
    h += `<i class="marca h" style="top:${y}mm;right:0;width:${x0 - 2}mm"></i>`;
  }
  return h;
}

function montar() {
  const base = $('base').value.trim() || PADRAO;
  const estilos = [...document.querySelectorAll('input[name=estilo]:checked')].map((i) => i.value);
  const musicas = window.MUSICAS.filter((m) => estilos.includes(m.estilo)).sort((a, b) => a.n - b.n);
  const porFolha = COLUNAS * LINHAS;
  const vazia = '<div class="carta vazia"></div>';
  let html = '';
  for (let i = 0; i < musicas.length; i += porFolha) {
    const grupo = musicas.slice(i, i + porFolha);
    const frentes = [];
    const versos = [];
    for (let p = 0; p < porFolha; p++) {
      const m = grupo[p];
      frentes.push(m ? frente(m, base) : vazia);
      // Verso espelhado: a coluna da esquerda da frente fica na direita do verso.
      const linha = Math.floor(p / COLUNAS);
      const espelho = grupo[linha * COLUNAS + (COLUNAS - 1 - (p % COLUNAS))];
      versos.push(espelho ? verso(espelho) : vazia);
    }
    html += `<section class="folha">${marcas()}<div class="grade">${frentes.join('')}</div></section>`;
    html += `<section class="folha">${marcas()}<div class="grade">${versos.join('')}</div></section>`;
  }
  const fichas = $('fichas').checked;
  if (fichas) {
    html += `<section class="folha fichas">${'<div class="ficha"></div>'.repeat(FICHAS_POR_FOLHA)}</section>`;
  }
  $('folhas').innerHTML = html;
  const folhas = Math.ceil(musicas.length / porFolha);
  $('resumo').textContent = `${musicas.length} cartas em ${folhas} folhas (${folhas * 2} páginas)` +
    (fichas ? ` + 1 página de fichas (${FICHAS_POR_FOLHA} fichas).` : '.');
}

$('base').value = baseInicial();
document.querySelectorAll('.painel input').forEach((i) => i.addEventListener('change', montar));
montar();
