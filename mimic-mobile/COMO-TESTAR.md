# Como testar o Imitashow — guia passo a passo (para quem nunca programou)

Este guia leva você do zero até o jogo rodando, sem pular nenhum clique. Há dois jeitos de testar:

| | Jeito 1 — **no navegador do computador** | Jeito 2 — **no celular Android (APK)** |
|---|---|---|
| Para quê | Ver tudo funcionando rápido | Jogar de verdade, passando o celular |
| Tempo na 1ª vez | uns 20 minutos | uns 40–60 minutos (a maior parte é só esperar) |
| Precisa de conta | Não | Sim, uma conta gratuita na Expo |
| Vibração ao tocar | Não | Sim |

**Sugestão:** faça as **Partes 1 e 2** (navegador) primeiro. Depois, se quiser no celular, siga a **Parte 3**.
As Partes 1 e 2 são iguais para os dois jeitos.

> O guia usa **Windows** como exemplo. No Mac as diferenças estão marcadas com 🍎.

### Palavras que aparecem no guia

- **Terminal** (no Windows, **Prompt de Comando**): uma janela preta onde você digita comandos. Parece coisa de
  hacker, mas aqui você só vai **copiar e colar** comandos prontos e apertar **Enter**.
- **Comando**: uma linha de texto que você cola no terminal, como `npm install`. Cole **exatamente** como está no
  guia (sem as crases `` ` ``).
- **APK**: o "arquivo instalador" de um app de Android, como um `.exe` no Windows.
- **Expo / EAS**: a empresa e o serviço gratuito que "fabricam" o APK na nuvem, para você não precisar instalar
  nada pesado no computador.

---

## Parte 1 — Preparar o computador (só na primeira vez)

### 1.1 Baixar o código do jogo

1. Abra o navegador e entre em **https://github.com/CleberVenom/Games** (entre na sua conta do GitHub se pedir).
2. Acima da lista de arquivos há um botão com o nome de um "ramo" (*branch*), com um ícone de galho. Clique nele.
3. Na caixinha de busca que abre, digite `eloquent` e clique em **`claude/eloquent-clarke-joi9qe`**.
   Esse ramo é a versão de teste do Imitashow.
4. Clique no botão verde **`<> Code`** e depois em **Download ZIP**. O arquivo vai para a pasta *Downloads*.
5. Crie uma pasta com nome curto direto no disco, por exemplo **`C:\jogos`**.
   (Nomes de pasta muito compridos causam erro na instalação no Windows — por isso a pasta curta.)
6. Vá até *Downloads*, clique com o botão direito no ZIP → **Extrair tudo…** → **Procurar…** → escolha
   `C:\jogos` → **Extrair**.
7. Dentro de `C:\jogos` vai aparecer uma pasta com nome parecido com `Games-claude-eloquent-clarke-joi9qe`.
   Dentro dela, a pasta do jogo é a **`mimic-mobile`**. Guarde esse caminho.

### 1.2 Instalar o Node.js (o "motor" que roda o projeto)

1. Entre em **https://nodejs.org**.
2. Baixe a versão marcada como **LTS** (é a estável). Precisa ser a **22 ou mais nova**.
3. Abra o instalador e vá clicando em **Next** (Avançar), aceitando os termos.
4. Se aparecer a tela **"Tools for Native Modules"** com uma caixinha
   *"Automatically install the necessary tools"*, **deixe desmarcada** — não é necessária aqui e demora muito.
5. Clique em **Install** e depois em **Finish**.

**Conferir se deu certo:**

1. Aperte a tecla **Windows**, digite `cmd` e aperte **Enter**. Abre o **Prompt de Comando** (janela preta).
2. Digite `node -v` e aperte **Enter**.
3. Deve aparecer algo como `v22.xx.x` ou `v24.xx.x`. Pronto! Pode fechar essa janela.

🍎 No Mac: instale o Node pelo mesmo site (arquivo `.pkg`). O terminal se chama **Terminal** (procure no
Spotlight com ⌘ + Espaço).

### 1.3 Abrir o terminal *dentro* da pasta do jogo

1. Abra o **Explorador de Arquivos** e entre em `C:\jogos\Games-claude-eloquent-clarke-joi9qe\mimic-mobile`.
   Você está no lugar certo se vir arquivos como `package.json`, `app.json` e `COMO-TESTAR.md`.
2. Clique uma vez na **barra de endereço** lá em cima (onde aparece o caminho da pasta), apague o que estiver
   escrito, digite `cmd` e aperte **Enter**.
3. Abre um Prompt de Comando **já dentro dessa pasta** — a linha termina com `...\mimic-mobile>`.

> ⚠️ Use o **Prompt de Comando** (`cmd`), **não** o PowerShell: no PowerShell o Windows costuma bloquear os
> comandos com a mensagem *"a execução de scripts foi desabilitada neste sistema"*.

🍎 No Mac: abra o Terminal, digite `cd ` (com um espaço no final), **arraste a pasta `mimic-mobile`** para dentro
da janela do Terminal e aperte **Enter**.

### 1.4 Instalar as peças do projeto

Na janela do terminal aberta no passo anterior, cole o comando abaixo e aperte **Enter**:

```
npm install
```

- Demora de **1 a 5 minutos** (baixa algumas centenas de MB). Espere voltar a aparecer o `...\mimic-mobile>`.
- Linhas amarelas com `npm warn deprecated` são **normais**, pode ignorar.
- Deu certo se terminar com algo como `added 1144 packages`. Se aparecer `npm error` / `ERR!`, veja a Parte 5.

Isso é feito **uma vez só**. Nas próximas vezes, pule direto para a Parte 2 ou 3.

---

## Parte 2 — Jeito 1: jogar no navegador do computador

1. No terminal (aberto na pasta `mimic-mobile`, como no passo 1.3), cole e aperte **Enter**:

   ```
   npm run web
   ```

2. Aguarde. Na primeira vez leva **até 1 minuto** para "montar" o jogo. O navegador abre sozinho no endereço
   **http://localhost:8081**. Se não abrir, abra o **Chrome** e digite esse endereço.
3. Aparece a tela inicial do **Imitashow**.
4. Ao tocar em **Começar partida**, o navegador pergunta se o site pode usar o **microfone** → clique em
   **Permitir**. (O som fica no seu computador; nada é enviado para a internet.)
5. Siga o **roteiro de teste da Parte 4**.
6. Para desligar: volte na janela preta e aperte **Ctrl + C** (se perguntar algo, digite `S` e **Enter**), ou
   simplesmente feche a janela.

**Dicas para o teste no navegador:**
- Use o **Google Chrome** ou o **Microsoft Edge**.
- Deixe o volume do computador em um nível confortável e fale **perto do microfone**.
- Para ver o jogo no "formato de celular", aperte **F12** e depois **Ctrl + Shift + M** (opcional).
- Os packs que você criar no navegador ficam **só nesse navegador** (não vão para o celular).

---

## Parte 3 — Jeito 2: instalar no celular Android

Este app usa o microfone de um jeito avançado, então ele **não abre no app "Expo Go"** da Play Store — não
precisa baixá-lo. Em vez disso, o serviço gratuito da Expo "fabrica" um **APK** próprio do jogo na nuvem, e você
instala esse APK no celular.

**Precisa de:** celular com **Android 7 ou mais novo**, e as Partes 1.1 a 1.4 já feitas no computador.

### 3.1 Criar uma conta gratuita na Expo

1. Entre em **https://expo.dev** e clique em **Sign up** (Cadastrar).
2. Preencha e-mail, nome de usuário e senha, e confirme o e-mail que eles mandarem.
3. O plano **Free** (gratuito) basta. Não precisa cadastrar cartão.

### 3.2 Entrar na conta pelo terminal

1. Abra o terminal na pasta `mimic-mobile` (passo 1.3).
2. Cole e aperte **Enter**:

   ```
   npx eas-cli@latest login
   ```

3. Se perguntar *"Need to install the following packages… Ok to proceed? (y)"*, digite `y` e aperte **Enter**.
4. O **navegador abre** na página da Expo: entre com a sua conta e confirme. Se o navegador não abrir, o terminal
   mostra um link — copie e cole no navegador.
5. O terminal mostra **`Logged in`**. Pronto.

### 3.3 Mandar a Expo fabricar o APK

1. Na **mesma janela** do terminal, cole e aperte **Enter** (esta linha avisa o serviço que a pasta veio de um
   ZIP, e não do Git):

   ```
   set EAS_NO_VCS=1
   ```

   🍎 No Mac, use no lugar: `export EAS_NO_VCS=1`

2. Agora cole e aperte **Enter**:

   ```
   npx eas-cli@latest build -p android --profile preview
   ```

3. Avisos em amarelo como *"Using EAS CLI without version control system is not recommended"* ou
   *"Falling back to using current working directory"* são **esperados** por causa do passo 1. Pode ignorar.
4. O terminal vai fazer algumas perguntas. Responda assim:

   | Pergunta (em inglês) | O que responder |
   |---|---|
   | *Generate a new Android Keystore?* (a "assinatura" do app; só aparece se ainda não existir) | Aperte **Enter** (= sim) |
   | Qualquer outra pergunta de sim/não | Aperte **Enter** (a resposta padrão serve) |

5. O terminal envia o projeto para a Expo e mostra um link **"Build details: https://expo.dev/…"**.
   A fabricação leva, em média, **10 a 30 minutos** (no plano gratuito às vezes há fila e demora mais).
   - Pode deixar a janela aberta esperando **ou** fechar — a fabricação continua na nuvem.
   - Para acompanhar: abra o link mostrado, ou entre em **expo.dev** → conta **v3-app** → projeto **cleber-santarosa** → **Builds**.
6. Quando terminar, aparece **"Build finished"**, um **QR code** e um link para baixar o arquivo `.apk`.

### 3.4 Instalar o APK no celular

1. No celular, **aponte a câmera para o QR code** (no terminal ou na página do build) e toque no link que aparecer.
   Alternativa: abra **expo.dev** no navegador do celular, entre na sua conta → **v3-app** → **cleber-santarosa** → **Builds** →
   o build mais recente → **Install**.
2. Baixe o arquivo `.apk` (uns 105 MB — de preferência no Wi-Fi) e toque nele para abrir (ou vá em **Arquivos →
   Downloads**). Se o Chrome avisar que **"este tipo de arquivo pode ser perigoso"**, toque em **Baixar mesmo
   assim** — sem isso o download fica parado, mesmo parecendo completo (o aviso pode estar na notificação ou na
   lista de downloads do Chrome).
3. O Android vai avisar que não pode instalar apps "desta fonte". Toque em **Configurações** → ative
   **Permitir desta fonte** → volte.
4. Toque em **Instalar**. Se o **Play Protect** avisar que o app é desconhecido, toque em **Mais detalhes** →
   **Instalar mesmo assim** (é normal: o app não está na Play Store).
5. Abra o **Imitashow**. Quando ele pedir o **microfone**, toque em **Durante o uso do app** (ou **Permitir**).
6. Siga o **roteiro de teste da Parte 4**.

**Versões novas, depois deste APK:** não precisa baixar APK. Ao abrir o jogo, aparece na tela inicial **"Nova
versão disponível"** → toque em **Atualizar**: ele baixa só o que mudou e reinicia sozinho. No rodapé da tela inicial
aparece **"Versão 1.0.0 · atualizada em dd/mm às hh:mm"** — é assim que você confere que está na versão nova. Só
quando eu avisar que mudou uma parte nativa (biblioteca nova, permissão) é preciso instalar um APK novo por cima do
antigo.

### Atalho: eu mesmo gero o APK para você

Se preferir **não** mexer com terminal, eu consigo fabricar o APK daqui (a sessão agora tem acesso à Expo).
Você só precisa:

1. Criar a conta na Expo (passo 3.1).
2. Entrar em **https://expo.dev/settings/access-tokens** → **Create token** → dar um nome (ex.: `claude`) →
   copiar o código gerado.
3. Aqui no Claude Code, abrir o **menu do ambiente de nuvem** na barra de título da sessão → **Edit** → adicionar
   uma variável de ambiente chamada **`EXPO_TOKEN`** com esse código como valor. **Nunca cole o código no chat.**
4. Abrir uma nova sessão e me pedir para gerar o APK. Eu devolvo o link; você faz só a Parte 3.4 no celular.

Depois do teste, se quiser, apague o token na mesma página da Expo — ele deixa de valer na hora.

---

## Parte 4 — Roteiro de teste (marque o que funcionou)

Uma partida com **2 jogadores** tem **5 rodadas** (cada jogador joga uma vez por rodada = 10 vezes no total).
Com 6 jogadores, são 6 rodadas.

### Tela inicial (jogadores e packs)

- [ ] Tocar em **Adicionar jogador** até chegar a **6/6** (o botão some no máximo).
- [ ] Tocar no nome de um jogador e **trocar o nome**.
- [ ] Cada jogador começa com um **mascote** diferente (sem a inicial do nome). Tocar no mascote abre a folha **"Escolha o mascote"**.
- [ ] **Deslizar para os lados** no carrossel e tocar em um mascote livre: ele vira o do jogador. Passar direto por um e voltar nele também funciona.
- [ ] Os mascotes dos **outros jogadores aparecem apagados, com cadeado e o nome de quem pegou**, e não dá para escolhê-los.
- [ ] Trocar o mascote libera o antigo para os outros.
- [ ] Remover um jogador (ícone de lixeira — só aparece com 3 ou mais jogadores).
- [ ] Conferir a linha acima do botão: com 2 jogadores diz **"5 rodadas"**; com 6, **"6 rodadas"**.
- [ ] Na seção **Packs de sons** há **3 packs oficiais** (Animais & natureza, Vozes & zoeira, Efeitos & games),
      com **75 sons** no total. Desmarcar e marcar packs e ver o total de sons mudar.
- [ ] Desmarcar **todos** os packs: o botão fica apagado com o texto **"Escolha pelo menos um pack de sons"**.

### Criar o seu próprio pack

- [ ] Tocar em **Criar pack (gravar ou importar sons)**.
- [ ] Dar um nome e escolher um ícone.
- [ ] Tocar em **Gravar**, fazer um som (de 1,4 a 15 segundos) e tocar em **Parar e salvar o som**.
- [ ] Gravar um som **bem curto** (menos de 1,4 s): aparece o aviso **"Som muito curto"** e ele não entra.
- [ ] Tocar em **Importar áudio** e escolher um MP3/WAV/M4A do aparelho (ex.: um áudio do WhatsApp salvo).
- [ ] **Vários de uma vez**: tocar em **Importar áudio**, abrir o **Drive** (menu ☰ do seletor), **tocar e segurar** o
      primeiro som, tocar nos outros e em **Selecionar**. No rodapé aparece **"Importando 1 de N…"** com a barra
      andando, e os sons vão entrando na lista. Se algum ficar de fora (curto, em silêncio, formato errado), um resumo
      no fim diz quais.
- [ ] Sair (**←** → **Descartar**) no meio de uma importação grande: a importação para e o pack não muda.
- [ ] Ouvir, renomear e remover um som da lista.
- [ ] Tocar em **Salvar pack**: ele aparece na tela inicial com o selo **Meu pack**.
- [ ] Tocar no **lápis** do pack para editar; testar também **apagar o pack**.
- [ ] **Fechar e abrir o app** de novo (no navegador: recarregar a página): o pack continua lá.
- [ ] Jogar uma partida só com o seu pack marcado.

### Compartilhar um pack com amigos (precisa de internet)

- [ ] Abrir o **lápis** de um pack seu: no cartão **Compartilhar com amigos**, tocar em **Compartilhar pack**. Aparece
      "Enviando 1 de N sons…" e depois o **código de 5 letras**.
- [ ] **Enviar código** abre o compartilhamento (WhatsApp etc.) com o código e o caminho no app.
- [ ] No celular do amigo: tela inicial → **Baixar pack de amigo (código)**, digitar o código → **Procurar**: aparece o
      nome do pack e os sons. Tocar em **Baixar pack** → "Pronto!".
- [ ] O pack aparece na tela inicial do amigo ("Baixado de um amigo"), já marcado, e toca normalmente no editor e na
      partida, **mesmo sem internet**.
- [ ] Código errado mostra **"Código não encontrado"**; procurar de novo um pack que já baixou mostra **"Esse pack já
      está no seu celular"**.
- [ ] Mudar o nome ou os sons do pack: o cartão pede para **salvar**; depois de salvar, compartilhar de novo gera um
      **código novo**.

### A vez de cada jogador

- [ ] Tocar em **Começar partida**. Aparece **"Passe o celular para [nome]"** → tocar em **Estou pronto**.
- [ ] O som de referência **toca sozinho** e as barrinhas **rolam**: entram pela direita e somem pela esquerda
      enquanto o som toca.
- [ ] Tocar em **Ouvir de novo (1x)**: toca mais uma vez. Depois disso, não dá para repetir de novo.
- [ ] Depois que o som toca, aparece a legenda **"Som original / Sua voz"**. Embaixo do botão aparece quanto tempo
      a gravação vai durar.
- [ ] Tocar no botão grande **Toque para imitar** e imitar o som: as barrinhas rosa da sua voz rolam da direita para
      a esquerda e, atrás delas, a **silhueta do som original** (contorno azul) rola junto — tente acompanhar a
      altura dela. A gravação dura **exatamente o tempo do som** e termina sozinha: **não há botão
      de parar**, e um anel em volta do botão vai se apagando até o fim do tempo.
- [ ] Aparece **"Analisando…"** e depois a **nota de 0 a 100**, com as barras **Tom** e **Ritmo**.
- [ ] Faça uma vez **em silêncio** (sem imitar nada): a nota deve ser **0** ("Isso foi um som?").
- [ ] Faça uma imitação caprichada e uma de propósito errada: a caprichada deve ganhar nota maior.

### Roleta de efeitos

- [ ] Depois da nota, tocar em **Girar a roleta**: a roleta gira (no celular, vibra a cada casa) e para em um efeito.
- [ ] O efeito vale para o **próximo jogador**. Tocar em **Próximo: [nome]**.
- [ ] Ao longo das partidas, conferir os efeitos:

  | Efeito | O que deve acontecer |
  |---|---|
  | **Eco** | O som de referência toca com eco |
  | **Distorção** | O som toca "estourado", distorcido |
  | **Acelerado** | O som toca rápido e mais fino |
  | **Telefone** | O som toca abafado, como numa ligação |
  | **Sem repetição** | O botão "Ouvir de novo" não aparece |
  | **Tempo curto** | A gravação dura só 70% do tempo do som |
  | **Pontos em dobro** | A nota conta em dobro no placar |
  | **+15 pontos** | Ganha 15 pontos extras (só se fizer algum som) |
  | **Nada acontece** | Vez normal |

### Fim da partida

- [ ] O topo mostra **"Rodada X de 5"** e avança certo.
- [ ] Na última vez, o botão muda para **Ver o pódio**.
- [ ] O **pódio** mostra 1º, 2º e 3º lugares (empates dividem a posição) e os demais abaixo.
- [ ] **Jogar de novo**: recomeça com os mesmos jogadores, placar zerado, rodada 1.
- [ ] **Novo jogo (trocar jogadores ou packs)**: volta para a tela inicial.
- [ ] No meio de uma partida, apertar o **voltar** do Android: pergunta **"Sair da partida?"** antes de sair.

### Modo online (depois de ligar o Firebase — veja o [FIREBASE.md](FIREBASE.md))

Precisa de **2 ou mais celulares** com o **mesmo APK**, cada um com internet (Wi-Fi ou dados).

- [ ] Na tela inicial, tocar em **Jogar online com amigos**, digitar o nome e **Criar sala**: aparece o **código de 4
      letras**.
- [ ] **Convidar amigos** abre o compartilhamento (WhatsApp etc.) com o código.
- [ ] No outro celular: **Jogar online com amigos → Entrar numa sala**, digitar o código → aparece na lista dos dois
      celulares (com o ponto verde de online).
- [ ] Código errado mostra **"Sala não encontrada"**.
- [ ] Cada pessoa entra na sala com um **mascote diferente**. Tocar no seu mascote (com o ícone de trocar) abre o carrossel; os mascotes dos outros aparecem bloqueados com o nome deles.
- [ ] Em **dois celulares ao mesmo tempo**, tocar no mesmo mascote livre: só um fica com ele e o outro vê **"Alguém acabou de escolher esse"**.
- [ ] O anfitrião escolhe os packs e toca em **Começar partida** (só libera com 2 ou mais pessoas).
- [ ] **Packs do anfitrião**: o anfitrião marca um pack criado por ele e começa. O botão mostra "Enviando seus
      packs…" (só na primeira vez ou se o pack mudou) e os convidados veem **"Baixando os sons da partida"** antes da
      primeira imitação com som desse pack. Depois, o pack fica nos packs de cada convidado.
- [ ] Cada um toca em **Ouvir o som**, imita e vê **"Imitação enviada!"** com quem ainda falta.
- [ ] Quando todos enviam, começa a **apresentação** em todos os celulares: nome do jogador, a imitação dele
      tocando e a nota.
- [ ] Tocar nos emojis **😂 🍅 😄 😱**: eles sobem na tela de **todo mundo** e a contagem aparece nos botões.
- [ ] **Placar** da rodada com os pontos e as reações; o anfitrião gira a **roleta** (o efeito vale para todos na
      próxima rodada) e toca em **Próxima rodada**.
- [ ] Na última rodada, **pódio** em todos os celulares; só o anfitrião vê **Jogar de novo**.
- [ ] Se o anfitrião sair da sala, os outros veem **"A sala foi encerrada"**.

#### Chat de voz (de preferência com os celulares em cômodos diferentes, ou com fone)

- [ ] Ao entrar na sala, aparece **"Microfone aberto: a sala te ouve"** e todos se ouvem pelo alto-falante (não pelo
      alto-falante de ligação, o de encostar no ouvido).
- [ ] Quem fala ganha um **anel verde** no avatar; o botão de microfone (canto de cima) brilha quando **você** fala.
- [ ] Tocar no botão de microfone: fica **mudo** (os outros veem "mudo" e deixam de te ouvir); tocar de novo, volta.
- [ ] O anfitrião toca no **microfone ao lado de um jogador** (ou no jogador, na faixa de cima): ele fica mutado e vê
      **"O anfitrião mutou o seu microfone"**. O anfitrião **não tem** como ligar de volta; só o próprio jogador, no
      botão dele.
- [ ] Quando o anfitrião começa a partida, aparece **"Voz pausada durante os sons"** e ninguém se ouve durante a
      imitação e a apresentação. A gravação da imitação funciona normalmente.
- [ ] No **placar da rodada**, na **roleta** e no **pódio**, a voz volta sozinha (quem estava mudo continua mudo).
- [ ] Se aparecer **"Voz sem conexão"**, tocar no botão para tentar de novo. Em algumas redes 4G a ligação direta não
      funciona — anote qual operadora/rede para eu investigar.

---

## Parte 5 — Se algo der errado

| O que aconteceu | O que fazer |
|---|---|
| `'node' não é reconhecido como um comando…` | Feche e abra o Prompt de Comando de novo. Se continuar, reinstale o Node (passo 1.2) e reinicie o computador. |
| *"a execução de scripts foi desabilitada neste sistema"* | Você está no PowerShell. Abra o **Prompt de Comando** pelo passo 1.3 (digitando `cmd` na barra de endereço). |
| `npm install` deu erro falando de caminho/nome muito longo | Mova a pasta para `C:\jogos` (passo 1.1) e rode `npm install` de novo. |
| `npm error` / `ERR!` por outro motivo | Tire um print da janela e me mande. |
| `Could not find package.json` / `ENOENT` | O terminal não está na pasta certa. Refaça o passo 1.3 dentro da pasta **`mimic-mobile`**. |
| O navegador não pediu o microfone, ou você clicou em "Bloquear" | Clique no **cadeado** (ou ícone de ajustes) ao lado do endereço → **Microfone** → **Permitir** → recarregue a página (F5). |
| No celular aparece **"Microfone bloqueado"** | Toque em **Abrir configurações** → **Permissões** → **Microfone** → **Permitir durante o uso do app**. |
| O som de referência não sai no celular | Aumente o **volume de mídia** (não o do toque) e confira se o celular não está no silencioso. |
| A nota é sempre 0 | O microfone não está captando: fale mais perto e mais alto; no computador, confira o microfone escolhido nas configurações de som do Windows. |
| O build da Expo terminou com **"Build failed"** | Abra o link do build, copie o link e me mande — eu vejo o erro. |
| O APK não instala ("app não instalado") | Desinstale uma versão antiga do Imitashow (antes chamado Mimic Mobile), se houver, e tente de novo. |
| O download do APK "termina", mas o arquivo não aparece | No Chrome, abra **⋮ → Downloads** e toque em **Baixar mesmo assim** no aviso de arquivo perigoso. Confira se há uns 500 MB livres e use o Wi-Fi. |
| Não aparece o aviso "Nova versão disponível" | Feche o jogo de verdade (tire da lista de apps recentes) e abra de novo, com internet. Ele procura ao abrir, no máximo a cada 10 minutos. |
| Tocou em **Atualizar** e apareceu "Não deu para baixar" | Confira a internet e toque em **Tentar de novo**. |
| Tentou abrir pelo app **Expo Go** | Não funciona com este jogo. Use o APK (Parte 3). |

---

## Parte 6 — O que ainda não foi testado (e por quê)

Tudo foi validado no computador: 85 testes automáticos, o jogo inteiro no navegador com microfone simulado e a
montagem do app de Android. O que **ainda não** foi possível testar daqui:

- **Um celular Android de verdade** (desempenho, microfone, vibração e alto-falante reais).
- **Vozes humanas de verdade**: a nota foi calibrada com gravações e sons de teste. A "régua" pode precisar de
  ajuste depois que o grupo jogar (é um ajuste simples no código).
- **Packs compartilhados no Firebase de verdade**: o envio, o download por código e o download automático na sala
  foram testados no emulador do Firebase (com internet lenta e com envio interrompido), não com celulares reais nem
  com packs grandes (dezenas de sons de 15 s) pelo 4G.
- **iPhone**: exige conta paga de desenvolvedor da Apple, por isso ficou fora deste teste.
- **Packs pessoais** (pasta `packs-pessoais/`): o mecanismo está pronto, mas a pasta está vazia até você colocar
  os seus sons.

## O que me mandar depois do teste

Isso me ajuda a ajustar o jogo:

1. O **modelo do celular** e a versão do Android (Configurações → Sobre o telefone).
2. Os itens do roteiro que **não** funcionaram, com print ou gravação de tela, se der.
3. **Notas que pareceram injustas**: qual era o som, se a imitação foi boa ou ruim, e a nota que saiu
   (ex.: "imitei bem o cachorro e tirei 20").
4. Sons de referência muito altos, muito baixos ou difíceis demais.
