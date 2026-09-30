'use strict';
// App do DJ: lê o QR da carta, toca a prévia de 30 s do Deezer sem mostrar o nome da música.

const $ = (id) => document.getElementById(id);
const porNumero = new Map(window.MUSICAS.map((m) => [m.n, m]));
const audio = $('audio');
// 10 ms de silêncio: tocado no primeiro toque do usuário para liberar o áudio no celular,
// assim a música pode começar sozinha logo depois de escanear (como no jogo original).
const SILENCIO = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

let atual = null; // música da carta aberta
let urlPrevia = null; // URL da prévia da carta aberta
let audioLiberado = false;
let comPrevia = false; // o <audio> está com a prévia da carta (e não com o silêncio)
let stream = null; // câmera

function mostrar(tela) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === tela));
  window.scrollTo(0, 0);
}
function status(texto) {
  $('status').textContent = texto;
}

// ---------- Deezer ----------
// A API pública do Deezer não libera CORS para o navegador, então usamos JSONP.
function deezer(caminho) {
  return new Promise((resolve, reject) => {
    const nome = `dz${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    const fim = (erro, dados) => {
      clearTimeout(timer);
      delete window[nome];
      script.remove();
      erro ? reject(erro) : resolve(dados);
    };
    const timer = setTimeout(() => fim(new Error('tempo esgotado')), 10000);
    window[nome] = (dados) => (dados && !dados.error ? fim(null, dados) : fim(new Error('erro do Deezer')));
    script.onerror = () => fim(new Error('sem conexão'));
    script.src = `https://api.deezer.com/${caminho}${caminho.includes('?') ? '&' : '?'}output=jsonp&callback=${nome}`;
    document.head.appendChild(script);
  });
}

// As URLs de prévia expiram em alguns minutos, por isso são buscadas na hora de tocar.
async function buscarPrevia(m) {
  const faixa = await deezer(`track/${m.deezer}`);
  if (faixa.preview) return faixa.preview;
  const busca = await deezer(`search?q=${encodeURIComponent(`${m.artista} ${m.musica}`)}&limit=5`);
  const outra = busca.data.find((t) => t.preview);
  if (outra) return outra.preview;
  throw new Error('sem prévia');
}

// ---------- Áudio ----------
function liberarAudio() {
  if (audioLiberado) return;
  audioLiberado = true;
  comPrevia = false;
  audio.src = SILENCIO;
  audio.play().catch(() => {});
}

function tocar() {
  if (!urlPrevia) return Promise.resolve(false);
  if (!comPrevia) {
    audio.src = urlPrevia;
    comPrevia = true;
  }
  if ('mediaSession' in navigator) {
    // Não deixa o nome da música aparecer no controle de mídia do celular.
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Hitaço', artist: 'Qual é o ano?' });
  }
  return audio.play().then(() => true, () => false);
}

function parar() {
  comPrevia = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  $('progresso').style.width = '0';
}

audio.addEventListener('play', () => {
  if (!comPrevia) return;
  document.body.classList.add('tocando');
  $('icone').textContent = '❚❚';
  status('Tocando… Onde essa música entra na linha do tempo?');
});
audio.addEventListener('pause', () => {
  document.body.classList.remove('tocando');
  $('icone').textContent = '▶';
});
audio.addEventListener('ended', () => {
  if (comPrevia) status('Fim da prévia. Toque no disco para ouvir de novo.');
});
audio.addEventListener('timeupdate', () => {
  if (comPrevia && audio.duration) {
    $('progresso').style.width = `${(100 * audio.currentTime) / audio.duration}%`;
  }
});
audio.addEventListener('error', () => {
  if (!atual || !comPrevia) return;
  // Prévia expirada ou falha de rede: busca uma URL nova.
  comPrevia = false;
  carregar(atual, false);
});

// ---------- Carta ----------
function abrirCarta(n) {
  pararCamera();
  parar();
  $('resposta').hidden = true;
  $('bt-revelar').hidden = false;
  mostrar('player');
  atual = porNumero.get(n) || null;
  urlPrevia = null;
  if (!atual) {
    status(`A carta nº ${n} não existe neste baralho.`);
    return;
  }
  carregar(atual, true);
}

function carregar(m, tocarAoCarregar) {
  urlPrevia = null;
  status('Carregando a música…');
  buscarPrevia(m).then(
    (url) => {
      if (atual !== m) return;
      urlPrevia = url;
      if (!tocarAoCarregar || !audioLiberado) return status('Pronto! Toque no disco para ouvir.');
      tocar().then((ok) => ok || status('Pronto! Toque no disco para ouvir.'));
    },
    () => {
      if (atual === m) status('Não deu para carregar a música. Confira a internet e toque no disco para tentar de novo.');
    },
  );
}

$('bt-tocar').addEventListener('click', () => {
  if (!atual) return;
  if (!audio.paused && comPrevia) return audio.pause();
  if (!urlPrevia) {
    liberarAudio();
    return carregar(atual, true);
  }
  audioLiberado = true; // este toque também libera o áudio
  tocar().then((ok) => ok || status('O celular bloqueou o áudio. Toque no disco de novo.'));
});

$('bt-inicio').addEventListener('click', () => {
  if (!urlPrevia) return;
  audio.currentTime = 0;
  tocar();
});

$('bt-revelar').addEventListener('click', () => {
  if (!atual || !confirm('Mostrar o ano, o artista e a música desta carta?')) return;
  $('r-artista').textContent = atual.artista;
  $('r-ano').textContent = atual.ano;
  $('r-musica').textContent = atual.musica;
  $('r-deezer').href = `https://www.deezer.com/track/${atual.deezer}`;
  $('resposta').dataset.estilo = atual.estilo;
  $('resposta').hidden = false;
  $('bt-revelar').hidden = true;
});

// ---------- Leitor de QR ----------
// O QR das cartas guarda o endereço do app com o número da carta: .../hitaco/#c=42
function numeroDoQr(texto) {
  const m = /[#?&]c=(\d{1,4})\b/.exec(texto) || /^\s*(\d{1,4})\s*$/.exec(texto);
  return m ? Number(m[1]) : null;
}

async function escanear() {
  parar();
  liberarAudio();
  atual = null;
  mostrar('scanner');
  const msg = $('scanner-msg');
  msg.textContent = 'Aponte a câmera para o QR code da carta.';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (e) {
    msg.textContent = 'Não foi possível abrir a câmera. Permita o acesso à câmera no navegador ou volte e digite o número da carta.';
    return;
  }
  const video = $('video');
  video.srcObject = stream;
  await video.play().catch(() => {});
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const quadro = () => {
    if (!stream) return;
    if (video.readyState >= 2 && video.videoWidth) {
      const escala = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (qr) {
        const n = numeroDoQr(qr.data);
        if (n) {
          if (navigator.vibrate) navigator.vibrate(60);
          return abrirCarta(n);
        }
        msg.textContent = 'Esse QR code não é de uma carta do Hitaço.';
      }
    }
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

function pararCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $('video').srcObject = null;
}

$('bt-escanear').addEventListener('click', escanear);
$('bt-proxima').addEventListener('click', escanear);
$('bt-voltar').addEventListener('click', () => {
  pararCamera();
  mostrar('inicio');
});
$('form-numero').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = Number($('in-numero').value);
  if (!n) return;
  liberarAudio();
  $('in-numero').value = '';
  abrirCarta(n);
});

// Carta aberta pela câmera do próprio celular (link do QR code).
function abrirDoLink() {
  const n = numeroDoQr(location.hash);
  if (!n) return;
  history.replaceState(null, '', location.pathname + location.search);
  abrirCarta(n);
}
window.addEventListener('hashchange', abrirDoLink);
abrirDoLink();
