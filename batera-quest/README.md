# 🥁 Batera Quest

App gamificado para aprender bateria no celular, no estilo Guitar Hero: as notas descem pela pista,
você toca na hora certa e ganha pontos, combos, XP, novos kits e músicas mais difíceis.

- **Android primeiro, com iOS pronto**: Expo + React Native, um único código para as duas plataformas.
- **Sons reais**: todos os sons são gravações de baterias acústicas (CC0) — veja `assets/sounds/CREDITS.md`.
- **Idioma**: português do Brasil.

## Funcionalidades

| Área | O que tem |
|---|---|
| Teste de nível | 8 perguntas (experiência + 2 perguntas de conhecimento). Coloca o aluno em Iniciante, Básico, Intermediário ou Avançado, pulando as unidades que ele já domina e liberando o kit correspondente. Pode ser refeito no Perfil (nunca apaga progresso). |
| Trilha de aulas | 6 unidades / 31 aulas: peças e postura → levadas de rock → viradas → semicolcheias e rudimentos → groove avançado (ride, funk, half-time, shuffle) → metal e pedal duplo. Cada aula tem teoria, grade rítmica ("1 e 2 e"), exemplo em áudio e exercício jogável. 3★ liberam a próxima. |
| Jogo | Pista estilo Guitar Hero em paisagem, multitoque, bumbo como barra horizontal (faixa de pedal embaixo; dois pedais no kit Metal), chimbal aberto, janelas Perfeito/Ótimo/Bom, combo, multiplicador até 4x, "Energia" (x2), medidor de rock (falha fora do Fácil), contagem de baquetas, metrônomo, faixa-guia opcional, pausa. |
| Progressão | XP e níveis, 4 modelos de bateria liberados por nível (Iniciante 4 peças → Rock Clássico 6 → Studio Pro 8 → Metal Extremo com pedal duplo), músicas liberadas por nível, 12 conquistas, sequência de dias, recordes por dificuldade. |
| Setlist | 42 músicas em 4 dificuldades (Fácil/Médio/Difícil/Expert): Linkin Park, Metallica, Red Hot Chili Peppers, Creed, Thirty Seconds to Mars, Guns N' Roses, System of a Down e bandas do mesmo estilo (Queen, Nirvana, AC/DC, Foo Fighters, Evanescence, Audioslave, Papa Roach, Green Day, Muse, RATM, Disturbed, Slipknot, The White Stripes). |
| Latência | Calibragem manual no Perfil e sugestão automática na tela de resultados (média de atraso dos acertos). |

## ⚠️ Músicas e direitos autorais

O app **não inclui gravações das músicas nem instrumentais** (playbacks sem bateria também são
protegidos: tanto a composição quanto a gravação). Também não inclui transcrições das partes de bateria
originais. O que existe hoje para cada música:

- metadados (título, artista, gênero, andamento **aproximado**);
- um **chart provisório** gerado com levadas genéricas do estilo, no andamento aproximado, com estrutura
  intro/verso/refrão/ponte — o app avisa isso na tela da música;
- contagem de baquetas + metrônomo (sons reais) no lugar do playback.

Quando o licenciamento sair, basta adicionar o áudio (e, idealmente, o chart oficial) — veja abaixo.
Para uso comercial, normalmente são necessárias licenças da **editora** (composição / sincronização) e da
**gravadora** (master), além de autorização para transcrever a parte de bateria.

### Adicionando uma música licenciada

1. Coloque o arquivo em `assets/songs/` (m4a, mp3 ou wav). Para o jogo, o ideal é o playback **sem a bateria**.
2. Em `src/content/songs.ts`, preencha o mapa `LICENSED`:

   ```ts
   const LICENSED = {
     'in-the-end': {
       backingTrack: require('../../assets/songs/in-the-end.m4a'),
       audioOffset: 0.42, // segundos entre o início do arquivo e o 1º tempo do chart
       bpm: 105,          // andamento exato da gravação
       charts: { expert: inTheEndExpert, dificil: inTheEndHard /* ... */ },
     },
   };
   ```

3. Um `Chart` é `{ bpm, beatsPerBar, duration, notes: [{ time, piece, open? }] }`, com `time` em segundos a partir
   do 1º tempo e `piece` ∈ `kick | snare | hihat | tom1 | tom2 | floor | crash | ride`. Também dá para montar
   charts por compassos em grade com `chartFromBars()` (`src/game/pattern.ts`), como nas aulas.
   Dificuldades sem chart oficial continuam usando o provisório.

Com playback, o metrônomo é desligado automaticamente e o áudio é sincronizado pelo mesmo relógio de áudio
que julga os acertos.

## Tecnologia

- **Expo SDK 57 / React Native 0.86 / TypeScript**, navegação com **Expo Router**.
- **react-native-audio-api** (Web Audio API nativa — Oboe no Android, AVAudioEngine no iOS): baixa latência,
  vários sons simultâneos, agendamento com precisão de amostra. O relógio de áudio é a referência de tempo do jogo.
- **Reanimated 4**: a pista é desenhada na thread de UI (pool de "gemas" reaproveitadas), sem re-render do React a cada quadro.
- **zustand + AsyncStorage**: progresso salvo no aparelho.
- Por usar módulos nativos de áudio, o app **não roda no Expo Go** — é preciso um *development build* ou APK.

## Rodando

```bash
npm install
npm test            # testes da lógica do jogo (julgamento, charts, progressão, nivelamento)
npm run typecheck
```

### Android (APK para instalar no celular)

Sem Android Studio, pelo EAS (nuvem da Expo, tem plano gratuito):

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview      # gera um .apk para instalar direto
npx eas-cli@latest build -p android --profile development  # APK de desenvolvimento (hot reload)
npx expo start --dev-client                                # depois, com o APK de desenvolvimento instalado
```

Com Android Studio/SDK instalado localmente: `npm run android` (equivale a `expo run:android`).

### iOS

A estrutura já está pronta (bundle id `com.bateraquest.app`, sessão de áudio em modo *playback* para tocar
mesmo com a chave de silêncio). Para gerar: `npx eas-cli@latest build -p ios` (requer conta Apple Developer)
ou `npm run ios` num Mac com Xcode.

### Navegador (para testes rápidos)

`npm run web` — funciona com mouse/toque e teclado (A S D F G H J K nas pistas, Espaço no bumbo, Esc pausa).

## Estrutura

```
src/
  app/            telas (Expo Router): onboarding, abas (Palco, Aulas, Músicas, Kits, Perfil), aula, música, jogo, resultados
  game/           lógica pura e testada: julgamento/pontuação, gerador de charts, redução para o kit, progressão, nivelamento
  content/        conteúdo: aulas, músicas, kits, peças, perguntas do nivelamento
  audio/          motor de áudio, relógio sincronizado, prévia de exemplos, mapa de samples
  play/           controlador da partida, pista (Reanimated), HUD
  store/          progresso persistido e resultado da última partida
  ui/             componentes visuais, grade rítmica, pads do kit
assets/sounds/    samples WAV (CC0) + CREDITS.md
scripts/          build-samples.py (regera os samples a partir das fontes CC0)
```
