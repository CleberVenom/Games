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
| 1 | Estrutura do projeto + UI premium: cadastro de jogadores e tela de jogo com todas as fases do turno | ✅ **com áudio simulado** |
| 2 | Captura do microfone + player do som de referência | ⏳ |
| 3 | DSP local: FFT, *pitch tracking* e curva de amplitude → nota | ⏳ |
| 4 | Roleta de modificadores/sabotagens no fim do turno | ⏳ |

### O que "áudio simulado" quer dizer no Passo 1

A UI é jogável de ponta a ponta, mas ainda sem som: a referência "toca" pela duração do som, as barras
reagem a um sinal sintético, a gravação termina sozinha no fim da janela e a nota é **aleatória**. A tela de
jogo mostra o selo **Simulado** enquanto isso. Tudo o que é simulação está isolado em dois arquivos,
que os Passos 2 e 3 substituem sem mexer nas telas:

- `src/audio/useSyntheticLevels.ts` → vira a leitura do `AnalyserNode` (FFT) do áudio real;
- `src/audio/useSimulatedTurn.ts` → vira reprodução/gravação reais + a nota do DSP.

## Regras do turno

`handoff` (passe o celular) → `listening` (a referência toca **sozinha, uma vez**) → `ready` (pode **ouvir de
novo 1 vez** ou gravar) → `recording` (**uma chance**, sem repetir; termina ao tocar ou no fim da janela de
referência + 1,5 s, entre 2,5 s e 6 s) → `analyzing` → `result` (nota de tom, ritmo e total) → próximo jogador.
A rodada avança quando todos jogaram; os sons não se repetem até o baralho acabar.

A máquina de estados é pura e testada: `src/game/match.ts` + `src/game/__tests__/match.test.ts`.

## Arquitetura

```
src/
  app/          telas (Expo Router): index = cadastro de jogadores, game = tela de jogo
  components/   UI: botões com gradiente, visualizador de áudio, botão de gravação, placar, nota…
  game/         lógica pura: tipos, catálogo de sons, máquina de estados da partida (+ testes)
  store/        estado da partida (zustand)
  audio/        Passo 1: sinal sintético e simulação do turno (substituídos nos Passos 2–3)
  theme/        paleta única (Tailwind + gradientes) e utilitários de cor/brilho
assets/images/  ícones e splash (gerados por scripts/make-icons.py)
```

Passos seguintes entram em `src/audio/` (motor de áudio) e `src/dsp/` (FFT, pitch, ritmo, nota).

### Stack

- **Expo SDK 57 / React Native 0.86 / TypeScript**, navegação com **Expo Router**.
- **NativeWind 4 (Tailwind CSS 3.4)** para estilização — o Tailwind "puro" só funciona na web; o NativeWind
  compila as mesmas classes para estilos nativos. `1rem = 16px` também no celular (`inlineRem: 16`).
- **Reanimated 4**: barras de áudio, halo do botão de gravação e toques animados rodam na thread de UI.
- **expo-linear-gradient** (gradientes neon), **expo-haptics** (resposta tátil), fonte **Inter**.

### Design

Dark mode azul-noturno (`night-950 #0A0C1D`, nunca preto puro), destaques em gradiente violeta → rosa e
ciano, texto em `mist` (nunca branco puro), cantos de 16–32 px, sombras e brilhos coloridos suaves (`boxShadow`),
botões que encolhem com mola ao toque (e crescem no *hover* do mouse, na web). A paleta fica em
`src/theme/palette.js` e é a única fonte de cor: o `tailwind.config.js` substitui as cores padrão por ela.

### Dependências de áudio (Passos 2–4)

| Pacote | Para quê |
|---|---|
| `react-native-audio-api` (Software Mansion) | Web Audio nativo (Oboe no Android): `AudioRecorder` com buffers PCM do microfone, `AnalyserNode` (FFT em tempo real para as barras), `decodeAudioData` para os sons de referência, `DelayNode`/`WaveShaperNode` para as sabotagens (eco, distorção) e pedido de permissão do microfone. O *config plugin* adiciona `android.permission.RECORD_AUDIO`. |
| `expo-asset` | Resolve os arquivos de referência empacotados no app para decodificação. |
| `expo-dev-client` | *Development build*: bibliotecas com código nativo não rodam no Expo Go. |
| — (TypeScript próprio) | FFT radix-2, *pitch tracking* (YIN/autocorrelação), envelope RMS/ataques e alinhamento por DTW para a nota. Sem dependências externas nem APIs pagas. |

## Rodando

```bash
npm install
npm test            # máquina de estados da partida
npm run typecheck
npm run lint
npx expo start      # Passo 1 roda no Expo Go: escaneie o QR code com o app Expo Go no Android
```

`npm run web` abre no navegador (útil para testar a UI rapidamente).

A partir do Passo 2 (microfone), o app precisa de um *development build* ou APK:

```bash
npx eas-cli@latest build -p android --profile preview      # APK para instalar direto
npx eas-cli@latest build -p android --profile development  # APK de desenvolvimento
```

Os ícones são gerados a partir da marca (as mesmas barras do `LogoMark`):
`pip install pillow && python3 scripts/make-icons.py`.
