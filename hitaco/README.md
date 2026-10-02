# 🎵 Hitaço

Versão caseira do jogo **Hitster** (Jumbo), só com músicas brasileiras: rock nacional, funk das antigas
e sertanejo raiz. As regras são as mesmas do
[manual do Hitster Original](https://hitstergame.com/pt-br/pages/como-jogar-hitster-original): cada carta
tem um QR code de um lado e o **ano**, o **artista** e a **música** do outro. O DJ escaneia a carta, a música
toca e o jogador tenta encaixá-la na sua linha do tempo. Ganha quem juntar 10 cartas.

> Projeto de fãs, sem ligação com a Jumbo ou com o Hitster. O nome “Hitaço” é só para diferenciar do
> jogo original.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| [`Hitaco-cartas.pdf`](Hitaco-cartas.pdf) | **Pronto para imprimir**: 184 cartas (frente e verso) + 70 fichas. |
| [`index.html`](index.html) | App do DJ (celular): lê o QR code e toca a prévia de 30 s sem mostrar o nome da música. Tem as regras. |
| [`Hitaco-instrucoes.pdf`](Hitaco-instrucoes.pdf) | **8 cartas de instrução** (A6, 4 por folha A4): jogadores, a carta, preparação, rodada, onde pôr a carta, fichas e fim de jogo. |
| [`instrucoes/`](instrucoes/) | As mesmas 8 cartas de instrução como imagens soltas, para mandar pelo celular. |
| [`instrucoes.html`](instrucoes.html) | Página que gera as cartas de instrução para imprimir. |
| [`cartas.html`](cartas.html) | Gera as folhas para impressão (dá para escolher estilos e o endereço do app no QR code). |
| [`musicas.js`](musicas.js) | A lista de músicas (uma carta por música). |
| [`arte/`](arte/) | Ilustrações das cartas, geradas com a IA de imagens do **Canva** (os originais estão no design “Hitaço – artes das cartas” da conta do Canva). |
| [`scripts/deezer.mjs`](scripts/deezer.mjs) | Preenche/confere o ID do Deezer de cada música. |

## As músicas (184 cartas)

- **Rock nacional (137):** Legião Urbana, Capital Inicial, Paralamas do Sucesso, Charlie Brown Jr., Pitty,
  CPM 22, NX Zero e mais: Titãs, Barão Vermelho, Cazuza, Engenheiros do Hawaii, Ira!, Ultraje a Rigor, RPM,
  Kid Abelha, Blitz, Lulu Santos, Rita Lee, Raul Seixas, Os Mutantes, Secos & Molhados, Skank, Raimundos,
  Mamonas Assassinas, O Rappa, Jota Quest, Detonautas, Los Hermanos, Biquini Cavadão, Nando Reis,
  Cássia Eller, Fresno, Camisa de Vênus, Frejat, Lobão, Nenhum de Nós e Restart.
- **Funk (18):** Claudinho & Buchecha, MC Marcinho, Bonde do Tigrão, Cidinho & Doca, MC Bob Rum,
  MC Júnior & MC Leonardo, Fernanda Abreu, Tati Quebra Barraco, Latino, MC Leozinho, Perlla e MC Créu.
- **Sertanejo raiz (29):** Tonico e Tinoco, Cascatinha e Inhana, Tião Carreiro & Pardinho, Sérgio Reis,
  Milionário & José Rico, Teodoro & Sampaio, Renato Teixeira, Trio Parada Dura, Chitãozinho & Xororó,
  Chrystian & Ralf, Leandro & Leonardo, Zezé Di Camargo & Luciano, João Paulo & Daniel, Gian & Giovani e
  Rick & Renner.

Os anos vão de 1946 a 2014. O ano da carta é o do **primeiro lançamento** da música pelo artista da carta.
Cada ano foi conferido com o ISRC da gravação e o MusicBrainz e, quando as fontes discordavam, com
pesquisa. Músicas com ano duvidoso ficaram de fora. Algumas faixas só existem no Deezer em versão ao
vivo ou regravada (CPM 22, NX Zero e parte de Charlie Brown Jr., Paralamas e Biquini Cavadão), então a
prévia toca essa versão, mas o ano da carta continua sendo o do lançamento original.

## Como montar o jogo

1. **Coloque o app no ar** (uma vez só). O QR code das cartas aponta para
   `https://clebervenom.github.io/Games/hitaco/`. Para esse endereço funcionar, ative o GitHub Pages do
   repositório: *Settings → Pages → Build and deployment → Deploy from a branch →* a branch principal do repositório (hoje `claude/gamified-drum-app-p5rqjq`) *e a pasta `/ (root)`*.
   (Em outro endereço, abra `cartas.html` de lá e gere de novo o PDF: o QR usa o endereço da página.)
2. **Imprima** o `Hitaco-cartas.pdf` em A4, **frente e verso virando na borda longa**, escala 100%,
   de preferência em papel de 180 g ou mais. Corte seguindo as marcas: cada carta tem 6,4 × 6,4 cm.
   A última página (fichas) é de um lado só.
3. **No dia do jogo:** o DJ abre o app no celular (dá para “Adicionar à tela inicial”), toca em
   **Escanear carta** e aponta para o QR code. A música começa sozinha. Se a câmera não funcionar, dá para
   digitar o número que aparece embaixo do QR code.

As prévias vêm do Deezer (30 s, sem precisar de conta), então o celular precisa de internet.
O leitor de QR code usa a câmera, e o navegador só libera a câmera em sites `https` (como o GitHub Pages).

## Adicionar músicas

1. Em `musicas.js`, acrescente uma linha `{"n":185,"ano":1999,"artista":"…","musica":"…","estilo":"rock"}`
   (use o próximo número livre; estilo `rock`, `funk` ou `sertanejo`).
2. Rode `node scripts/deezer.mjs` (Node 18+). Ele acha a faixa no Deezer, grava o `deezer` e avisa se
   alguma música ficou sem prévia. Confira a faixa escolhida no que ele imprimir.
3. Abra `cartas.html` no navegador e imprima só as folhas novas (ou salve um PDF novo).

## Créditos

- Ilustrações: geradas com o Canva (IA de imagens).
- Fontes: Bebas Neue e Montserrat (SIL Open Font License, em `fontes/`).
- [jsQR](https://github.com/cozmo/jsQR) (Apache 2.0) para ler QR codes e
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT) para gerá-los, em `vendor/`.
- Áudio: prévias de 30 s da API pública do Deezer, tocadas direto do Deezer (nada de áudio fica no repositório).
