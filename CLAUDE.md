# Games — regras para todos os projetos

Este repositório reúne vários apps/jogos, cada um na sua pasta (ex.: `mimic-mobile/`, `batera-quest/`).
As regras abaixo valem para **todo projeto novo**. Regras específicas de cada app ficam no `CLAUDE.md`/
`AGENTS.md` da pasta dele e têm prioridade quando forem mais específicas.

- **Idioma**: textos do app, commits de documentação e READMEs em português do Brasil.
- **Dúvidas**: pergunte antes de decidir algo que é do usuário (regra de jogo, escopo, conteúdo). Diga as
  suposições que fez. Não escolha em silêncio entre interpretações diferentes.
- **Projetos existentes**: `batera-quest` é anterior a este padrão (usa `StyleSheet`). Não migre projetos
  antigos para o padrão novo sem pedido.

## 1. Validar as ferramentas antes de começar

Nunca escolha stack de memória. No início de cada projeto (e ao adicionar qualquer biblioteca):

1. **Levante as opções** para cada necessidade (UI, estilização, animação, áudio, estado, testes…).
2. **Valide cada candidata** com dados atuais:
   - versão e data do último release: `npm view <pacote> dist-tags time --json`;
   - compatibilidade: `peerDependencies`, CHANGELOG (via `raw.githubusercontent.com`) e a versão
     do SDK/framework do projeto;
   - manutenção ativa, suporte a Android (prioridade) e iOS, e se roda no Expo Go ou exige *development build*.
3. **Prefira** o módulo oficial do framework (ex.: módulos `expo-*`) > biblioteca madura e mantida > código próprio.
4. **Registre a escolha e o porquê** no README do projeto (tabela "Stack").
5. Pesquisa na web: use `WebSearch`/`WebFetch`. A rede deste ambiente de nuvem foi liberada (set/2026):
   GitHub, npm, PyPI, `expo.dev`/`api.expo.dev` (EAS Build com o `EXPO_TOKEN` do ambiente), Freesound,
   OpenGameArt e Kenney funcionam; pixabay continua bloqueado. Se um site falhar, confira
   `curl -sS "$HTTPS_PROXY/__agentproxy/status"`; sem acesso à Expo, leia a documentação pelo código-fonte no
   GitHub (ex.: `expo/expo/docs/pages/...`) e use `EXPO_OFFLINE=1 npx expo install ...`.
6. Sons livres: prefira CC0/domínio público (ESC-50 só com clipes marcados `[CC0]` no LICENSE; prévias HQ de
   sons CC0 do Freesound; packs CC0 da Kenney/OpenGameArt). Confira cada candidato com um espectrograma antes
   de usar, e registre a origem no `CREDITS.md`.

### Stack já validada (set/2026) — ponto de partida, revalide as versões

| Necessidade | Escolha | Observação |
|---|---|---|
| App mobile | **Expo SDK 57 + React Native 0.86 + TypeScript + Expo Router** | rotas em `src/app/` |
| Estilização | **NativeWind 4.2.x (Tailwind CSS 3.4)** | Tailwind "puro" é só web; NativeWind 5 ainda é RC |
| Animação | **Reanimated 4** (+ `react-native-worklets`) | animações na thread de UI |
| Gradientes | `expo-linear-gradient` | classes `bg-gradient-*` não funcionam no nativo |
| Toque/feedback | `expo-haptics` | desligado na web |
| Fonte | **Inter** via `@expo-google-fonts/inter/<peso>` | importe por peso (o índice embute 18 arquivos) |
| Ícones | `@expo/vector-icons` (um só conjunto por app, ex.: Ionicons) | |
| Estado | `zustand` | lógica de jogo pura fora do store, testável |
| Áudio | `react-native-audio-api` | exige *development build* |
| Testes | `jest-expo` | |
| Online (salas, tempo real) | **Firebase JS SDK 12** — Realtime Database + Auth anônimo | roda no Expo Go; `initializeAuth` com `inMemoryPersistence`; regras versionadas em `database.rules.json` |
| Atualizações sem reinstalar | **expo-updates** (EAS Update) com `runtimeVersion: { policy: 'fingerprint' }` e canal por perfil do `eas.json` | aviso + botão no app (`checkAutomatically: NEVER`); mudança nativa exige APK novo |
| Tamanho do APK | `expo-build-properties` → `android.buildArchs: ["armeabi-v7a", "arm64-v8a"]` | tira o código de emulador (x86): ~190 → ~105 MB |
| Voz entre jogadores | **react-native-webrtc 124** + `@config-plugins/react-native-webrtc` + `react-native-incall-manager` | P2P com sinalização no Firebase; exige *development build*; alternativas pagas por minuto: LiveKit, Agora |
| Web (se o projeto for web) | Tailwind CSS 4 + React — **validar na hora** | |

## 2. Padrão visual premium (obrigatório)

Nenhuma tela "padrão" ou rudimentar. Toda UI segue:

- **Paleta moderna e harmoniosa, sem cores puras**: nada de `#000`/`#FFF`/vermelho puro. Fundo escuro
  grafite ou azul-noturno (dark mode premium é o padrão para jogos); destaques em gradiente (ex.: violeta →
  rosa, ciano). Uma **única fonte de cores** (`src/theme/palette.js`) usada pelo `tailwind.config.js`
  (substituindo `theme.colors`) e pelos componentes.
- **Bordas arredondadas generosas**: mínimo 16 px em cartões e botões; 24–32 px em cartões principais.
- **Profundidade**: sombras suaves e brilhos coloridos (`boxShadow`), cartões translúcidos com borda sutil
  (`bg-white/5`, `border-white/5`), fundo com brilhos difusos.
- **Tipografia limpa** (Inter ou sans geométrica) com hierarquia clara: rótulo pequeno em caixa alta com
  espaçamento (`tracking`), título grande em peso forte, corpo em cor suavizada.
- **Espaçamento amplo**: margens laterais ≥ 20 px, `gap` ≥ 12 px entre blocos.
- **Microinterações**: todo botão reage — encolhe com mola ao toque, cresce levemente no *hover* (web),
  vibração leve (haptics). Transições de entrada/saída nas mudanças de estado; indicadores vivos (ponto
  pulsando, barras animadas) onde algo está acontecendo.
- **Estados desenhados**: vazio, carregando, erro, sucesso e desabilitado têm visual próprio.
- **Acessibilidade**: alvos de toque ≥ 44 px, `accessibilityLabel` em botões só com ícone, contraste legível.
- **Identidade**: ícone do app, ícone adaptativo do Android e splash próprios, gerados a partir da marca
  (script versionado, nunca os ícones do template).

## 3. Validação antes de entregar

1. `npm test`, `npm run typecheck` e `npx expo lint` sem erros.
2. **Validação visual obrigatória**: `npx expo export --platform web`, servir a pasta e capturar com
   Playwright (Chromium já instalado em `/opt/pw-browsers`) **cada tela e cada estado** em viewport de
   celular (390×844, `deviceScaleFactor: 2`). Olhar as capturas, corrigir problemas de layout e só então
   entregar; enviar as capturas ao usuário.
3. Compilar o bundle Android (`npx expo export --platform android`) e, se mexeu em configuração nativa,
   `npx expo prebuild --platform android --no-install` (apague `android/` depois; é gerado).
4. Diga com clareza o que **não** foi possível testar (ex.: aparelho físico, microfone real).

## 4. Armadilhas conhecidas (NativeWind 4 + Expo 57)

- `withNativeWind(config, { input: './src/global.css', inlineRem: 16 })` — sem isso, 1rem = 14 px no celular.
- `className` **não** funciona em `Animated.View` do Reanimated: use `style` (ou um `View` por dentro).
  Componentes de terceiros e próprios precisam de `cssInterop(Componente, { className: 'style' })`.
- `ScrollView` horizontal numa coluna estica na vertical: use `className="grow-0"`.
- `TextInput` com `flex-1` numa linha: adicione `min-w-0` (e `web:outline-none`).
- Classes dinâmicas (`bg-${cor}-400`) não são geradas: para cores variáveis use `style` com o hex da paleta.
- Elementos decorativos posicionados para fora da tela (brilhos com `right: -120` etc.) tornam o contêiner
  rolável na web e a tela "escorrega" num clique/foco: o fundo decorativo deve ter `overflow: 'hidden'`.
- Áudio na web: `react-native-audio-api` não tem gravador na web; use um `mic.web.ts` com `getUserMedia`.
  Teste o fluxo de áudio no Chromium com `--use-fake-device-for-media-stream` e
  `--use-file-for-fake-audio-capture=<arquivo.wav>` (um cenário com voz e outro com silêncio).
- TypeScript 6: `"types": ["jest", "expo/types"]` no `tsconfig.json`.
- `expo prebuild` reescreve os scripts do `package.json`: desfaça só os scripts (`npm pkg set scripts.x=...`),
  **nunca** `git checkout package.json` com dependências novas ainda não commitadas.
- `babel-preset-expo` e `nativewind/babel` aplicam o plugin de worklets duas vezes; a saída é idêntica
  (idempotente) — mantenha a configuração oficial do NativeWind.
- Emulador do Firebase (`firebase-tools`): rode **sem** as variáveis de proxy (`env -u HTTPS_PROXY -u https_proxy
  -u GLOBAL_AGENT_HTTPS_PROXY -u npm_config_https_proxy ...`), senão o envio das regras para `localhost` falha. As
  regras só valem no namespace `<projeto>-default-rtdb` (ex.: `?ns=demo-mimic-default-rtdb`); em outro namespace
  tudo é liberado e o teste de segurança passa sem querer.
- Variáveis `EXPO_PUBLIC_*` são embutidas no bundle e o cache do Metro guarda o valor antigo: ao trocar (ex.: tirar
  `EXPO_PUBLIC_FIREBASE_EMULATOR`), exporte com `--clear`.
- Playwright com serviços reais (Firebase etc.): o Chromium daqui não confia na CA do proxy. Lance com
  `--proxy-server=https=<host:porta do $HTTPS_PROXY>` (o `localhost` segue direto) e
  `--ignore-certificate-errors-spki-list=<SPKI da /root/.ccr/agent-proxy-ca.crt>` (fixa só essa CA). WebSocket não
  passa pelo proxy (erro 500); o Firebase cai sozinho para *long polling*.
- `react-native-audio-api` no celular **ignora a taxa do AudioBuffer** ao tocar (lê uma amostra por quadro, na taxa
  do contexto): um buffer de 16 kHz num contexto de 48 kHz toca 3× mais rápido. Converta o PCM para
  `context.sampleRate` antes de `createBuffer` (`atContextRate` no Mimic). Na web o navegador converte sozinho, então
  o teste no navegador **não** pega esse erro — confira a taxa em teste unitário.
- EAS Update com política `fingerprint`: antes de `eas update`, confira que o fingerprint local
  (`npx expo-updates fingerprint:generate --platform android`) é o mesmo `runtimeVersion` do APK (`eas build:view`);
  se mudou algo nativo, a atualização não chega a ninguém — gere APK novo. Na web `expo-updates` fica desligado
  (`Updates.isEnabled` falso): para capturar o aviso, force o estado temporariamente e não commite.
- APK baixado pelo Chrome do Android para no aviso "arquivo perigoso" até tocar em **Baixar mesmo assim**; parece
  completo, mas o arquivo não aparece. Explique isso ao mandar o link.
- WebRTC no celular: sem `InCallManager.start({ media: 'video' })` a voz sai no alto-falante de ligação do Android;
  chame `InCallManager.stop()` ao sair da voz para o áudio do jogo voltar ao normal. O plugin do WebRTC adiciona
  `CAMERA` e `SYSTEM_ALERT_WINDOW`: bloqueie em `android.blockedPermissions` se o app não usa. Os tipos do
  react-native-webrtc não aceitam `echoCancellation` (o celular já liga por padrão).
- WebRTC no Playwright: `--disable-features=WebRtcHideLocalIpsWithMdns` (senão os contextos não se acham) e um
  `addInitScript` que guarda as `RTCPeerConnection` em `window.__pcs` para medir `bytesReceived`/`audioLevel`.
- Playwright: `getByText('Próxima rodada')` casa por substring sem diferenciar maiúsculas (pega títulos como
  "…na próxima rodada"); use `{ exact: true }`. Na web o Expo Router mantém as telas anteriores montadas.

## 5. Conteúdo e licenças

Sons, imagens, músicas e fontes só com licença clara (CC0, domínio público ou licença permissiva
compatível com distribuição). Registre origem e licença de cada arquivo num `CREDITS.md`. Trechos de TV,
filmes, músicas e vozes de pessoas (inclusive memes) são protegidos por direito autoral/imagem: não
entram no repositório sem autorização — prefira recriações próprias ou material CC0.

**Exceção decidida pelo dono do repositório (privado):** `mimic-mobile/packs-pessoais/` guarda packs de uso
privado do grupo (memes, anime…), adicionados por ele. Não apague nem "limpe" essa pasta; não adicione você
mesmo conteúdo protegido nela; e lembre que um app gerado com ela não pode ser publicado (use
`scripts/build-sounds.py --sem-pessoais` para a versão pública).
