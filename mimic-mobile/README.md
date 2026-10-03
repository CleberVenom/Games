# 🎤 Imitashow

Party game de imitação por voz, no estilo *Mimic Party*: o celular toca um som curto (latido, buzina,
efeito de meme…), o jogador tem **uma única chance** de imitar no microfone e recebe uma nota de 0 a 100
calculada localmente (tom + ritmo). Multijogador local, passando o celular (*pass-and-play*).

- **Android primeiro**, com iOS pronto: Expo + React Native, um código só.
- **Idioma**: português do Brasil.
- **Sem IA paga**: toda a análise de áudio roda no aparelho (DSP próprio).

## Roteiro

| Passo | O quê | Status |
|---|---|---|
| 1 | Estrutura do projeto + UI premium: cadastro de jogadores e tela de jogo com todas as fases do turno | ✅ |
| 2 | Captura do microfone + player do som de referência + catálogo de sons | ✅ |
| 3 | DSP local: FFT, *pitch tracking* e curva de amplitude → nota | ✅ |
| 4 | Roleta de modificadores/sabotagens no fim do turno | ✅ |
| + | Rodadas, pódio, seleção de packs, editor de packs no app e packs pessoais | ✅ |
| + | 1ª rodada de testes: gravação com o tempo do som (sem parar), silhueta do som original, 97 sons em 7 packs | ✅ |
| + | **Modo online** com amigos: salas com código, todos imitam juntos, apresentação das imitações com reações e chat de voz | ✅ (projeto Firebase `mimic-mobile-v3ltda`; veja [FIREBASE.md](FIREBASE.md)) |
| + | **Packs de amigos**: compartilhar um pack por código, baixar o pack de um amigo e packs do anfitrião baixados sozinhos na sala online | ✅ |
| + | **Paleta Carnaval e mascotes**: fundo uva vivo com rosa-choque → laranja; 15 mascotes no lugar das cores dos jogadores, com escolha exclusiva em carrossel (local e online) | ✅ |
| + | **Nome Imitashow e novo ícone**: o gato no microfone, num palco de stand-up com a plateia de mascotes (ícone adaptativo em camadas, abertura, logo e ícone de 512 px) | ✅ (exige APK novo) |

### Como a nota é calculada (Passo 3)

Tudo roda no aparelho, em TypeScript puro (`src/dsp/`), sem bibliotecas nem APIs externas:

1. **Pré-processamento** — referência e imitação são convertidas para 16 kHz (filtro anti-aliasing FIR) e
   cortadas em quadros de 64 ms a cada 16 ms.
2. **Características por quadro** (uma FFT de 2048 pontos por quadro):
   - **energia** em dB → a curva de amplitude (ritmo/ataques);
   - **pitch** pelo método de McLeod (NSDF a partir da autocorrelação via FFT), de 65 a 1000 Hz; quadros sem
     periodicidade clara ficam "sem tom";
   - **centroide espectral** → o "brilho", que faz o papel de tom nos sons de ruído (chuva, descarga, arroto).
3. **Trecho ativo** — o silêncio antes e depois é ignorado (atrasar o começo não perde ponto).
4. **Tom (0–100)** — contornos em semitons, em 24 fatias de tempo, comparados **sem exigir o mesmo tom de voz**
   (o deslocamento médio é descontado e erros de oitava não contam): imitar o galo uma oitava abaixo vale; imitar a
   sirene num tom só não. Para sons de ruído compara-se o contorno de brilho. A mistura segue quanto da referência
   tem tom definido.
5. **Ritmo (0–100)** — forma do envelope alinhada por DTW (tolera pequenas diferenças de tempo), número de golpes
   (sílabas, latidos, bipes) e duração.
6. **Total** = média de tom e ritmo. Sem som (menos de 0,15 s acima de −50 dBFS) a nota é 0.

Todos os parâmetros ficam em `TUNING` (`src/dsp/score.ts`) para calibrar com jogadores de verdade. Os testes
cobrem os blocos (FFT, reamostragem, pitch de 110/220/600 Hz, brilho), imitações sintéticas boas e ruins e uma
regressão com os 75 sons reais: cada som contra ele mesmo dá 100; contra os outros, nenhum passa de 90 e a média
fica em torno de 30.

### Roleta (Passo 4)

Depois da nota, quem jogou toca em **Girar a roleta**: ela dá 5 voltas desacelerando (com vibração a cada
casa) e o efeito sorteado vale **para o próximo jogador**, só no turno dele. O efeito aparece na tela "passe o
celular", num selo ao lado do nome durante o turno e, se for bônus, no cartão da nota.

| Tipo | Casas |
|---|---|
| **Bônus** | Pontos em dobro · +15 pontos (só se o jogador fizer algum som) |
| **Sabotagem de som** | Eco · Distorção · Acelerado (1,6×, mais agudo) · Telefone (só 500 Hz–2,5 kHz) |
| **Sabotagem de regra** | Sem repetição da referência · Tempo curto (a gravação dura só 70% do tempo do som) |
| **Neutra** | Nada acontece |

As sabotagens de som mudam **só a referência que o jogador ouve** (nós `DelayNode`, `WaveShaperNode`,
`BiquadFilterNode` e `playbackRate`, em `src/audio/effects.ts`); a nota continua comparando com o som limpo.
As 9 casas têm a mesma chance. A regra fica em `src/game/modifiers.ts` e na máquina de estados (fase
`wheel`); a roleta desenhada (`src/components/Wheel.tsx`, SVG) só anima até a casa que a regra já sorteou.

### Partida, rodadas e pódio

A partida tem **5 rodadas** com até 5 jogadores e **uma rodada por jogador** acima disso (6 jogadores → 6
rodadas; 10 jogadores → 10 rodadas). No mesmo celular cabem **até 10 jogadores**, como nas salas online. O cabeçalho mostra "Rodada X de N". Na última vez da última rodada não há roleta: o botão vira
**Ver o pódio** — 1º, 2º e 3º em degraus animados, demais colocados em lista, melhor imitação de cada um e
empates dividindo a posição. **Jogar de novo** repete jogadores e packs com o placar zerado.

### Mascotes dos jogadores

Cada jogador é um **mascote** (15 desenhos originais: polvo de fones, gato cantor, pintinho de festa, sapo rei,
estegossauro de óculos, tubarão de boné, robô de gravata, fantasma zoeiro, monstrinho de um olho, disfarce de
bigode, abacaxi de óculos, alien de antena, caveira pirata, coruja nerd e unicórnio festeiro). O que identifica o
jogador é a **forma e o rosto**, não a cor — por isso funciona também para quem tem daltonismo; o anel colorido é só
reforço. A inicial do nome não aparece mais.

- **Cada mascote é de um jogador só.** Quem escolhe um deixa o mascote bloqueado (com cadeado e o nome de quem
  pegou) para os outros. Há 15 mascotes para no máximo 10 jogadores, então o último a escolher sempre tem opção.
- **Carrossel lateral**: tocar no mascote (na tela inicial ou na sala online) abre uma folha com todos; deslize
  para os lados e toque para escolher. Rolar não escolhe nada, dá para passar direto e voltar.
- **Online**, a reserva é uma transação no Firebase (`rooms/{código}/avatars/{mascote}` = uid de quem pegou): se
  dois tocam no mesmo ao mesmo tempo, só um leva e o outro vê o aviso. Quem entra na sala ganha um mascote livre
  sorteado. A sala continua gravando a cor equivalente (`color`) para celulares que ainda não têm os mascotes.
- Desenhos: `scripts/make-avatars.py` (SVG feito à mão em código, sem licença de terceiros). Depois de mexer num,
  rode `python3 scripts/make-avatars.py`.

### Packs de sons

Como no Mimic Party, a partida sorteia só os sons dos **packs marcados** na tela inicial (a seleção fica salva):

| Origem | O que é | Onde fica |
|---|---|---|
| **Oficial** | Animais & natureza · Vozes & zoeira · Efeitos & games (75 sons CC0) | `assets/sounds/` |
| **Pessoal** | Seus packs de uso privado (memes BR/gringos, anime…) empacotados no app | `packs-pessoais/` — veja o [README](packs-pessoais/README.md) |
| **Meu pack** | Criados no próprio celular, no editor: grave pelo microfone ou importe MP3/WAV/M4A/OGG — ou baixados de um amigo pelo código | no aparelho (e no Firebase, se compartilhado) |

O **editor de packs** (botão "Criar pack" ou o lápis de um pack seu) tem nome, ícone e lista de sons com
ouvir, renomear e remover. Cada som passa pelo mesmo tratamento dos oficiais (`src/dsp/clip.ts`): silêncio
cortado, volume igualado e **de 1,4 a 15 s** (mais curto que 1,4 s é recusado, com aviso; acima de 15 s fica o trecho
mais forte). O áudio fica em `documentos/custom-sounds/` (IndexedDB na web) e a
lista de packs no AsyncStorage (`src/store/library.ts`).

**Importar vários de uma vez**: o seletor aceita vários arquivos (no Android, toque e segure o primeiro e toque nos
outros — vale também no Google Drive). Eles entram um por um, com "Importando 3 de 12…" no rodapé; no fim, um resumo
diz quais ficaram de fora e por quê (curtos, em silêncio, formato não suportado — `src/audio/importReport.ts`). No
Android o seletor não copia os arquivos na volta (`copyToCacheDirectory: false`): cada um é lido depois, em segundo
plano, pelo `expo-file-system` (aceita os `content://` do Drive) e decodificado da memória — copiar dezenas de sons do
Drive de uma vez travaria a tela.

**Compartilhar com amigos** (cartão no editor de um pack salvo): o botão "Compartilhar pack" envia os sons para o
Firebase e mostra um **código de 5 letras** ("Enviar código" manda pelo WhatsApp etc.). O amigo toca em **Baixar pack
de amigo** na tela inicial, digita o código, vê o nome e os sons e baixa: o pack entra nos packs dele, já marcado, e
funciona sem internet depois. O código vale para os sons de quando foi gerado: mudou o pack, salve e compartilhe de
novo (sai um código novo). Baixar o mesmo código de novo atualiza o pack baixado, e um pack baixado nunca sobrescreve
um pack criado no próprio celular. Por dentro: `src/online/sharedPacks.ts` (envio e download, WAV em base64 em
`sharedPacks/{código}`), `packShare.ts` (lógica pura, testada) e `src/app/pack/baixar.tsx`.

### Modo online (com amigos)

Cada um no seu celular. O anfitrião cria a sala (**código de 4 letras**, botão "Convidar amigos") e escolhe os
packs; os outros entram pelo código (até 10 jogadores, só antes de começar). Em cada rodada:

1. **Todos imitam ao mesmo tempo** o mesmo som: cada celular toca a referência quando o jogador toca em "Ouvir o
   som" (com a repetição e a silhueta de sempre), grava no tempo do som, calcula a nota e envia a imitação.
2. **Apresentação das gravações**: quando todos enviaram (ou em 30 s + 4× o som), cada imitação aparece em todos os
   celulares — nome do jogador, a gravação tocando com as barras e a nota. Todos reagem com **😂 🍅 😄 😱**: os emojis
   sobem na tela de todo mundo e a contagem fica no resultado.
3. **Placar da rodada** e **roleta**: o efeito sorteado vale **para todos** na rodada seguinte.
4. Na última rodada, **pódio** (com a melhor imitação de cada um); "Jogar de novo" volta ao lobby da mesma sala.

Rodadas: as mesmas da partida local (5, ou uma por jogador acima disso). Se o anfitrião sair, a sala é encerrada.

**Packs do anfitrião na sala**: além dos oficiais e pessoais, o anfitrião pode marcar os packs dele (criados ou
baixados). Ao tocar em "Começar partida", os que ainda não têm código (ou mudaram) são enviados ("Enviando seus
packs… 1/12") e os códigos vão na sala (`meta.shared`). Cada convidado baixa sozinho os que não tem
(`roomPacks.ts`), começando pelo pack do som da rodada; enquanto baixa, vê "Baixando os sons da partida" com o
andamento e, se a internet falhar, "Tentar de novo". Os packs ficam no celular de cada um para as próximas partidas.

**Chat de voz**: todos se falam na sala antes de começar, no placar da rodada, na roleta e no pódio. Na imitação e
na apresentação a voz é **desligada em todos os celulares** (e o microfone fica livre para a gravação); quando os sons
acabam, ela volta sozinha. O microfone entra **aberto**; o botão fixo no canto de cima liga e desliga o seu. O
**anfitrião pode mutar qualquer um** (botão na lista da sala ou tocando no jogador na faixa de cima), mas **só a
própria pessoa liga o microfone de volta** — as regras do banco não aceitam o anfitrião ligando o microfone de outro.
Quem está falando ganha um anel verde no avatar.

**Como funciona por dentro** (`src/online/`):

- **Firebase**: *Realtime Database* guarda a sala (`rooms/{código}`: meta, jogadores, rodada, notas, imitações e
  reações) e *Authentication* anônima identifica cada celular, sem cadastro. As regras (`database.rules.json`)
  deixam só o anfitrião avançar a partida e cada jogador escrever só a própria nota/imitação.
- **O anfitrião é a autoridade** (`useHost.ts`): fecha a rodada, passa as apresentações no tempo de cada imitação e
  soma o placar; a lógica é pura e testada (`room.ts`, `turn.ts`).
- **Imitação pela rede** (`clipCodec.ts`): 16 kHz, μ-law de 8 bits em base64 (~77 KB para 3,6 s), baixada só na
  hora da apresentação. A nota é calculada no próprio celular (mesmo DSP do modo local).
- **Voz** (`voice.ts`, `voiceMesh.ts`, `rtc.ts`/`rtc.web.ts`, `src/store/voice.ts`): o áudio vai **direto entre os
  celulares** (WebRTC, cada um ligado com todos). O Firebase só passa os recados para eles se acharem
  (`rooms/{código}/voice`: quem está na voz, microfones e recados lidos e apagados). Usa STUN gratuito do Google e da
  Cloudflare, sem servidor de retransmissão (TURN): em algumas redes 4G a ligação direta pode falhar, e o botão avisa
  "Voz sem conexão". O volume de quem fala vem das estatísticas do WebRTC.
- **Testes sem internet**: `npm run emulators` sobe o emulador do Firebase (Java 11+); com
  `EXPO_PUBLIC_FIREBASE_EMULATOR=127.0.0.1` o app usa o emulador em vez do projeto real.
- **Ligar de verdade**: siga o [FIREBASE.md](FIREBASE.md) e coloque a configuração do app da Web em
  `src/online/firebaseConfig.ts`. Sem ela, a tela "Jogar online" avisa que falta ligar o servidor.

## Regras do turno

`handoff` (passe o celular) → `listening` (a referência toca **sozinha, uma vez**) → `ready` (pode **ouvir de
novo 1 vez** ou gravar) → `recording` (**uma chance**, sem repetir e **sem botão de parar**: dura exatamente o
tempo do som original, com um anel de contagem regressiva) → `analyzing` → `result` (nota de tom, ritmo e
total) → `wheel` (roleta para o próximo turno) → próximo jogador.

O **gráfico de som rola**: cada barra é o volume num instante; uma barra nova entra pela direita a cada 70 ms e a
mais antiga sai pela esquerda (≈2,2 s na tela), tanto com o som original tocando quanto na gravação e na
apresentação online (`src/audio/loudness.ts` + `useVisualizer`). Na gravação, a **silhueta do som original** (o
volume dele no mesmo instante, medido como o analisador mede ao vivo) rola junto, atrás das barras da voz, e o
jogador tenta acompanhar a altura dela.
Todo som tem de **1,4 a 15 s** (os mais curtos ficam fora do catálogo), para a gravação nunca ser curta demais.
A rodada avança quando todos jogaram; os sons dos packs escolhidos não se repetem até o baralho acabar.

A máquina de estados é pura e testada: `src/game/match.ts` + `src/game/__tests__/match.test.ts`.

## Arquitetura

```
src/
  app/          telas (Expo Router): index = cadastro de jogadores, game = tela de jogo, online/ = salas online
  components/   UI: botões com gradiente, visualizador de áudio, botão de gravação, placar, nota…
  game/         lógica pura: tipos, catálogo de sons, máquina de estados da partida (+ testes)
  store/        estado da partida (zustand)
  audio/        motor de áudio, microfone (nativo e web), volume → gráfico rolando, fluxo de áudio do turno (+ testes)
  dsp/          FFT, reamostragem, extração de pitch/energia/brilho e a nota (+ testes)
  online/       modo online: sala e rodadas (lógica pura), Firebase, imitação pela rede, chat de voz (+ testes)
  theme/        paleta única (Tailwind + gradientes) e utilitários de cor/brilho
  avatars/      os 15 mascotes: desenhos (art.ts, gerado), nomes, cores e a lógica de quem já escolheu o quê (+ testes)
assets/images/  ícone, camadas do ícone adaptativo, abertura, favicon, logo e ícone de 512 px da Play (gerados por scripts/make-icons.py)
assets/icon/    as 3 camadas do ícone em SVG (palco, gato + microfone e a cena inteira), fonte editável
assets/avatars/ os 15 mascotes em SVG (gerados por scripts/make-avatars.py, que também escreve src/avatars/art.ts)
assets/sounds/  75 sons de referência + manifest.json + CREDITS.md (gerados por scripts/build-sounds.py)
```


### Áudio

```
referência ──► alto-falante
     └──────► AnalyserNode ──► ganho 0 ──► saída            volume (RMS) → gráfico rolando
microfone ───► AnalyserNode                                 (ramo mudo: sem microfonia)
     └──────► blocos PCM ──► Recording { samples, sampleRate }   entrada do DSP
```

- `src/audio/engine.ts`: contexto de áudio único, decodificação com cache (a referência é pré-carregada
  na tela "passe o celular") e reprodução com aviso de fim.
- `src/audio/mic.ts`: `AudioRecorder` + `RecorderAdapterNode` do `react-native-audio-api`, 22,05 kHz mono;
  pede a permissão do microfone ao começar a partida (com atalho para as configurações se negada).
  `mic.web.ts` faz o mesmo no navegador com `getUserMedia`.
- `src/audio/useAudioTurn.ts`: liga cada fase do turno ao áudio (tocar, gravar pelo tempo do som, analisar)
  e limpa tudo se o jogador sair no meio.
- `src/audio/analysis.ts`: analisa a referência já na tela "passe o celular" (com cache) e dá a nota da gravação.
  Também calcula a silhueta do som original no tempo (`prepareEnvelope`), que rola junto com a voz na gravação.

### Sons de referência

75 sons em 3 packs (os oficiais têm de 2 a 5 s; o jogo aceita de 1,4 a 15 s, para os sons importados):

| Pack | Sons |
|---|---|
| **Animais & natureza** (21) | cachorro, gato, galo, vaca, porco, ovelha, galinha, corvo, leão, cavalo, burro, cabra, lobo, baleia · ondas, goteira, trovão, arara, coruja, cigarra, mosca |
| **Vozes & zoeira** (21) | risada maligna, ronco, bebê, arroto, risada de criança, tosse, palmas, bocejo, soluço, gargarejo · trombone triste, scratch de DJ, buzina de torcida, caminhão do gás, celular antigo, dun dun duuun, "fire in the hole", rufar de tambores, vaia, internet discada, parabéns pra você |
| **Efeitos & games** (33) | buzina, sirene, apito de juiz, apito de trem, boing, despertador, lasers, vuvuzela, motosserra, sino de igreja, fogos, moto, pneu cantando · batida na porta, porta rangendo, escova de dentes, chaleira, micro-ondas, campainha, zíper, liquidificador, celular vibrando · "Ready… set… go!", "Round 1… Fight!", "3, 2, 1… Go!", "Choose your character!", "You lose… Game over!", risada do chefão, explosão, moedinhas, power-up, fase completa, pulos |

Os 7 packs da primeira versão foram juntados em 3 (out/2026). Os ids internos `animais`, `vozes` e `maquinas` foram
mantidos para a seleção salva no celular continuar valendo.

Ficaram de fora na primeira versão, quando o mínimo era 2 s: espirro, "ba dum tss" e "flawless victory" (o mínimo
agora é 1,4 s).
Excluídos depois da 2ª rodada de testes (out/2026), por não terem agradado: águia, pato, grito de queda, grilos,
apito de desenho, boom dramático, robô, furadeira, descarga, serrote, aspirador, panela de pressão, goles d'água,
vidro quebrando, tique-taque, lata abrindo, fogueira, papagaio, passarinho, tucano, chuva e bugio. O "Game over" de
fliperama virou "You lose… Game over!" (narrador do pack de luta da Kenney).

Todos são **CC0 ou domínio público** (origem de cada arquivo em `assets/sounds/CREDITS.md`): gravações dos
repositórios ESC-50 (só clipes CC0), Sonic Pi, VCSL, learntoread e CC0-Public-Domain-Sounds (packs da
Kenney, The Motion Monkey e Ben Burnes), prévias de sons CC0 do Freesound e efeitos sintetizados pelo próprio
script (inclusive os 8-bit, com melodias próprias). Memes que são trechos de TV, filmes, músicas ou vozes de
pessoas (ex.: Faustão, Galvão, Chaves) **não** estão incluídos: são protegidos por direito autoral e de imagem.
Os memes musicais usam obras em domínio público (Für Elise no caminhão do gás; Gran Vals no celular antigo;
a melodia de Happy Birthday no "Parabéns pra você").

Para adicionar um som: inclua em `SOUNDS` no `scripts/build-sounds.py` (id, pack, título, fonte e crédito) e
rode o script. Título, pack e duração vão para `assets/sounds/manifest.json`, lido por `src/game/sounds.ts`.

### Stack

- **Expo SDK 57 / React Native 0.86 / TypeScript**, navegação com **Expo Router**.
- **NativeWind 4 (Tailwind CSS 3.4)** para estilização — o Tailwind "puro" só funciona na web; o NativeWind
  compila as mesmas classes para estilos nativos. `1rem = 16px` também no celular (`inlineRem: 16`).
- **Reanimated 4**: barras de áudio, halo do botão de gravação e toques animados rodam na thread de UI.
- **expo-linear-gradient** (gradientes neon), **expo-haptics** (resposta tátil), fonte **Inter**.
- **react-native-svg** 15.15 (versão do SDK 57, roda também no Expo Go e na web) para as fatias da roleta.
- **expo-file-system**, **expo-document-picker** e **AsyncStorage** (versões do SDK 57) para os packs criados no app.
- **Firebase JS SDK 12.19** (Realtime Database + Authentication anônima) para o modo online — é o caminho indicado no
  guia do Expo para o SDK 57 (roda no app e na web, sem código nativo). Comparado em set/2026: Supabase (grátis,
  mas o projeto pausa após 1 semana sem uso) e servidor próprio (Colyseus/Cloudflare, exige hospedar). O plano
  grátis do Firebase aguenta 100 conexões simultâneas sem cartão.
- **expo-updates 57** (EAS Update, canal `preview`) para atualizar o app com um toque, e **expo-build-properties 57**
  para gerar o APK só com os processadores de celular.
- **react-native-webrtc 124.0.8** + **@config-plugins/react-native-webrtc 15.0.2** (plugin oficial da Expo para o
  SDK 56+) para o chat de voz, e **react-native-incall-manager 4.3.0** para a voz sair no alto-falante (sem ele, o
  Android usa o alto-falante de ligação) e o áudio voltar ao normal na hora dos sons. Exigem *development build* (o
  APK do EAS). Comparados em set/2026: LiveKit (5.000 min/mês grátis) e Agora (10.000 min/mês) — melhores em redes
  ruins, mas precisam de um servidor para gerar as chaves das salas; a conexão direta não tem custo por minuto. O
  plugin do WebRTC pede câmera e "sobrepor apps": as duas ficam bloqueadas em `android.blockedPermissions`.

### Design

Paleta **Carnaval** (out/2026, escolhida num estudo de colorimetria): fundo uva escuro e vivo (`night-950 #2E093C`,
nunca preto puro), destaques em gradiente rosa-choque → laranja (`fuchsia` → `tangerine`) com turquesa de contraste,
texto creme quente em `mist` (nunca branco puro), cantos de 16–32 px, sombras e brilhos coloridos suaves (`boxShadow`),
botões que encolhem com mola ao toque (e crescem no *hover* do mouse, na web). A paleta fica em
`src/theme/palette.js` e é a única fonte de cor: o `tailwind.config.js` substitui as cores padrão por ela.

### Dependências de áudio (Passos 2–4)

| Pacote | Para quê |
|---|---|
| `react-native-audio-api` (Software Mansion) | Web Audio nativo (Oboe no Android): `AudioRecorder` com buffers PCM do microfone, `AnalyserNode` (volume em tempo real para o gráfico rolando), `decodeAudioData` para os sons de referência, `DelayNode`/`WaveShaperNode` para as sabotagens (eco, distorção) e pedido de permissão do microfone. O *config plugin* (em `app.json`) adiciona só `android.permission.RECORD_AUDIO` — sem serviço em segundo plano. |
| `expo-asset` | Resolve os arquivos de referência empacotados no app para decodificação. |
| `expo-dev-client` | *Development build*: bibliotecas com código nativo não rodam no Expo Go. |
| — (TypeScript próprio) | FFT radix-2, *pitch tracking* (YIN/autocorrelação), envelope RMS/ataques e alinhamento por DTW para a nota. Sem dependências externas nem APIs pagas. |

## Rodando

> Nunca programou? Siga o guia passo a passo **[COMO-TESTAR.md](COMO-TESTAR.md)** (navegador e APK no celular).

```bash
npm install
npm test            # partida, rodadas e pódio, packs, catálogo, volume → gráfico rolando, DSP, nota e recorte de sons
npm run typecheck
npm run lint
```

### Android

Com o microfone (Passo 2), o app usa módulo nativo de áudio e **não roda mais no Expo Go** — é preciso um
*development build* ou APK (EAS, na nuvem da Expo; tem plano gratuito):

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview      # APK para instalar direto no celular
npx eas-cli@latest build -p android --profile development  # APK de desenvolvimento (hot reload)
npx expo start                                             # depois, com o APK de desenvolvimento instalado
```

Com Android Studio/SDK instalado localmente: `npm run android` (`expo run:android`).

O APK leva só o código dos processadores de celular (`armeabi-v7a` e `arm64-v8a`, via `expo-build-properties`):
~105 MB em vez de ~190 MB com os de emulador.

### Atualizar sem reinstalar (EAS Update)

Mudanças no JavaScript e nos sons chegam **sem baixar APK**: a tela inicial mostra **"Nova versão disponível →
Atualizar"**, um toque baixa só o que mudou e reinicia o jogo. O rodapé mostra a versão e, depois de atualizar,
"atualizada em dd/mm às hh:mm".

```bash
npx eas-cli@latest update --channel preview --environment preview --message "o que mudou"   # quem tem o APK "preview"
```

- O app **não baixa sozinho** (`checkAutomatically: NEVER`): procura ao abrir e ao voltar para ele (no máximo a
  cada 10 min) e só baixa quando o jogador toca em Atualizar (`src/updates/`).
- `runtimeVersion` usa a política **fingerprint**: uma atualização só chega aos APKs com o **mesmo código nativo**.
  Biblioteca nativa nova, permissão ou plugin em `app.json` → é preciso gerar e instalar um APK novo.
- Plano grátis da Expo: 1.000 usuários ativos por mês e 100 GiB de download.
- **Identificador do pacote (`android.package` / `ios.bundleIdentifier`) segue `com.mimicmobile.app`** de propósito: com
  ele, o APK novo instala por cima do antigo e mantém os packs salvos no celular. Ele **não pode mudar depois do
  primeiro envio à Google Play**, então decida (ex.: `com.imitashow.app`) antes de publicar. A pasta do projeto e o
  projeto do Firebase também ainda têm o nome antigo (`mimic-mobile`); isso é interno e ninguém vê.

### Navegador

`npm run web` roda o jogo completo, com microfone (o navegador pede permissão ao começar a partida).

### Gerar os assets

```bash
pip install numpy imageio-ffmpeg && python3 scripts/build-sounds.py   # sons (baixa as fontes do GitHub)
pip install pillow && python3 scripts/make-icons.py                   # ícone, abertura e logo (precisa do Playwright; veja o cabeçalho do script)
python3 scripts/make-avatars.py                                       # os 15 mascotes (src/avatars/art.ts e assets/avatars/*.svg)
```
