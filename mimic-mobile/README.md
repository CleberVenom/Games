# 🎤 Mimic Mobile

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
regressão com os 97 sons reais: cada som contra ele mesmo dá 100; contra os outros, nenhum passa de 90 e a média
fica em torno de 29.

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
rodadas). O cabeçalho mostra "Rodada X de N". Na última vez da última rodada não há roleta: o botão vira
**Ver o pódio** — 1º, 2º e 3º em degraus animados, demais colocados em lista, melhor imitação de cada um e
empates dividindo a posição. **Jogar de novo** repete jogadores e packs com o placar zerado.

### Packs de sons

Como no Mimic Party, a partida sorteia só os sons dos **packs marcados** na tela inicial (a seleção fica salva):

| Origem | O que é | Onde fica |
|---|---|---|
| **Oficial** | Animais · Vozes · Memes & zoeira · Máquinas & efeitos · Games & 8-bit · Casa & cotidiano · Natureza & clima (97 sons CC0) | `assets/sounds/` |
| **Pessoal** | Seus packs de uso privado (memes BR/gringos, anime…) empacotados no app | `packs-pessoais/` — veja o [README](packs-pessoais/README.md) |
| **Meu pack** | Criados no próprio celular, no editor: grave pelo microfone ou importe MP3/WAV/M4A/OGG | só no aparelho |

O **editor de packs** (botão "Criar pack" ou o lápis de um pack seu) tem nome, ícone e lista de sons com
ouvir, renomear e remover. Cada som passa pelo mesmo tratamento dos oficiais (`src/dsp/clip.ts`): silêncio
cortado, volume igualado e **de 2 a 5 s** (mais curto que 2 s é recusado, com aviso). O áudio fica em `documentos/custom-sounds/` (IndexedDB na web) e a
lista de packs no AsyncStorage (`src/store/library.ts`).

## Regras do turno

`handoff` (passe o celular) → `listening` (a referência toca **sozinha, uma vez**) → `ready` (pode **ouvir de
novo 1 vez** ou gravar) → `recording` (**uma chance**, sem repetir e **sem botão de parar**: dura exatamente o
tempo do som original, com um anel de contagem regressiva) → `analyzing` → `result` (nota de tom, ritmo e
total) → `wheel` (roleta para o próximo turno) → próximo jogador.

Na hora de imitar (`ready` e `recording`), a **silhueta do som original** fica fixa e translúcida atrás das
barras: é a média das barras do som, calculada com a mesma FFT do analisador (`referenceProfile` em
`src/audio/spectrum.ts`). As barras da voz oscilam por cima, e o jogador tenta preencher a silhueta.
Todo som tem de **2 a 5 s** (os mais curtos ficam fora do catálogo), para a gravação nunca ser curta demais.
A rodada avança quando todos jogaram; os sons dos packs escolhidos não se repetem até o baralho acabar.

A máquina de estados é pura e testada: `src/game/match.ts` + `src/game/__tests__/match.test.ts`.

## Arquitetura

```
src/
  app/          telas (Expo Router): index = cadastro de jogadores, game = tela de jogo
  components/   UI: botões com gradiente, visualizador de áudio, botão de gravação, placar, nota…
  game/         lógica pura: tipos, catálogo de sons, máquina de estados da partida (+ testes)
  store/        estado da partida (zustand)
  audio/        motor de áudio, microfone (nativo e web), espectro → barras, fluxo de áudio do turno (+ testes)
  dsp/          FFT, reamostragem, extração de pitch/energia/brilho e a nota (+ testes)
  theme/        paleta única (Tailwind + gradientes) e utilitários de cor/brilho
assets/images/  ícones e splash (gerados por scripts/make-icons.py)
assets/sounds/  97 sons de referência + manifest.json + CREDITS.md (gerados por scripts/build-sounds.py)
```


### Áudio

```
referência ──► alto-falante
     └──────► AnalyserNode (FFT) ──► ganho 0 ──► saída      barras do visualizador
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
  Também calcula a silhueta do som original (`prepareProfile`), mostrada atrás das barras na hora de imitar.

### Sons de referência

97 sons em 7 packs (todos com 2 a 5 s):

| Pack | Sons |
|---|---|
| **Animais** (16) | cachorro, gato, galo, vaca, porco, ovelha, galinha, corvo, leão, cavalo, burro, pato, cabra, lobo, baleia, águia |
| **Vozes** (11) | risada maligna, ronco, bebê, arroto, risada de criança, tosse, palmas, bocejo, soluço, gargarejo, grito de queda |
| **Memes & zoeira** (14) | trombone triste, scratch de DJ, buzina de torcida, caminhão do gás, celular antigo, dun dun duuun, "fire in the hole", grilos, boom dramático, apito de desenho, rufar de tambores, vaia, internet discada, parabéns pra você |
| **Máquinas & efeitos** (17) | buzina, sirene, apito de juiz, apito de trem, boing, despertador, descarga, robô, lasers, vuvuzela, motosserra, sino de igreja, fogos, serrote, moto, furadeira, pneu cantando |
| **Games & 8-bit** (11) | "Ready… set… go!", "Round 1… Fight!", "3, 2, 1… Go!", "Choose your character!", "Game over" de fliperama, risada do chefão, explosão, moedinhas, power-up, fase completa, pulos |
| **Casa & cotidiano** (15) | batida na porta, porta rangendo, lata abrindo, aspirador, tique-taque, vidro quebrando, escova de dentes, goles, panela de pressão, chaleira, micro-ondas, campainha, zíper, liquidificador, celular vibrando |
| **Natureza & clima** (13) | chuva, ondas, fogueira, goteira, trovão, passarinho, arara, bugio, tucano, coruja, papagaio, cigarra, mosca |

Ficaram de fora, por terem menos de 2 s mesmo sem silêncio: espirro, "ba dum tss" e "flawless victory".

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

### Design

Dark mode azul-noturno (`night-950 #0A0C1D`, nunca preto puro), destaques em gradiente violeta → rosa e
ciano, texto em `mist` (nunca branco puro), cantos de 16–32 px, sombras e brilhos coloridos suaves (`boxShadow`),
botões que encolhem com mola ao toque (e crescem no *hover* do mouse, na web). A paleta fica em
`src/theme/palette.js` e é a única fonte de cor: o `tailwind.config.js` substitui as cores padrão por ela.

### Dependências de áudio (Passos 2–4)

| Pacote | Para quê |
|---|---|
| `react-native-audio-api` (Software Mansion) | Web Audio nativo (Oboe no Android): `AudioRecorder` com buffers PCM do microfone, `AnalyserNode` (FFT em tempo real para as barras), `decodeAudioData` para os sons de referência, `DelayNode`/`WaveShaperNode` para as sabotagens (eco, distorção) e pedido de permissão do microfone. O *config plugin* (em `app.json`) adiciona só `android.permission.RECORD_AUDIO` — sem serviço em segundo plano. |
| `expo-asset` | Resolve os arquivos de referência empacotados no app para decodificação. |
| `expo-dev-client` | *Development build*: bibliotecas com código nativo não rodam no Expo Go. |
| — (TypeScript próprio) | FFT radix-2, *pitch tracking* (YIN/autocorrelação), envelope RMS/ataques e alinhamento por DTW para a nota. Sem dependências externas nem APIs pagas. |

## Rodando

> Nunca programou? Siga o guia passo a passo **[COMO-TESTAR.md](COMO-TESTAR.md)** (navegador e APK no celular).

```bash
npm install
npm test            # partida, rodadas e pódio, packs, catálogo, espectro → barras, DSP, nota e recorte de sons
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

### Navegador

`npm run web` roda o jogo completo, com microfone (o navegador pede permissão ao começar a partida).

### Gerar os assets

```bash
pip install numpy imageio-ffmpeg && python3 scripts/build-sounds.py   # sons (baixa as fontes do GitHub)
pip install pillow && python3 scripts/make-icons.py                   # ícones e splash
```
