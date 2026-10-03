# Como ligar o modo online (Firebase) — passo a passo

O modo **Jogar online** usa o **Firebase**, um serviço gratuito do Google que guarda as salas e passa as imitações
de um celular para o outro. Você faz isso **uma vez só**, leva uns 10 minutos e **não precisa de cartão de
crédito** (plano gratuito "Spark": até 100 pessoas conectadas ao mesmo tempo).

Você vai precisar de uma **conta Google** (a do Gmail serve) e de um computador (dá pelo celular, mas é mais
chato).

---

## 1. Criar o projeto

1. Entre em **https://console.firebase.google.com** e faça login com sua conta Google.
2. Clique em **Criar um projeto** (ou **Adicionar projeto**).
3. Nome do projeto: `mimic-mobile` (pode ser outro). Aceite os termos e clique em **Continuar**.
4. Na tela do **Google Analytics**, **desative** a opção (o jogo não usa) e clique em **Criar projeto**.
5. Espere terminar e clique em **Continuar**.

## 2. Criar o banco de dados das salas (Realtime Database)

1. No menu da esquerda, abra **Criação** (ou **Build**) → **Realtime Database**.
2. Clique em **Criar banco de dados**.
3. Local: escolha **Estados Unidos (us-central1)** e clique em **Próxima**.
4. Escolha **Iniciar no modo bloqueado** e clique em **Ativar**.
5. Abra a aba **Regras**, **apague tudo** o que estiver escrito e **cole exatamente o texto abaixo** (é o conteúdo do
   arquivo `database.rules.json`). Depois clique em **Publicar**.

   ```json
   {
     "rules": {
       "sharedPacks": {
         "$code": {
           ".read": "auth != null",
           "meta": {
             ".write": "auth != null && !data.exists() && newData.child('owner').val() === auth.uid",
             ".validate": "newData.child('packId').isString() && newData.child('title').isString() && newData.child('title').val().length <= 40"
           },
           "sounds": {
             ".write": "auth != null && root.child('sharedPacks').child($code).child('meta/owner').val() === auth.uid"
           },
           "audio": {
             "$sound": {
               ".write": "auth != null && root.child('sharedPacks').child($code).child('meta/owner').val() === auth.uid",
               ".validate": "newData.isString() && newData.val().length < 1400000"
             }
           },
           "done": {
             ".write": "auth != null && root.child('sharedPacks').child($code).child('meta/owner').val() === auth.uid",
             ".validate": "newData.isBoolean()"
           }
         }
       },
       "rooms": {
         "$code": {
           ".read": "auth != null",
           ".write": "auth != null && data.child('meta/host').val() === auth.uid",
           "meta": {
             ".write": "auth != null && !data.exists() && newData.child('host').val() === auth.uid && newData.child('status').val() === 'lobby'"
           },
           "players": {
             "$uid": {
               ".write": "auth != null && auth.uid === $uid && (data.exists() || root.child('rooms').child($code).child('meta/status').val() === 'lobby')",
               ".validate": "!newData.exists() || (newData.child('name').isString() && newData.child('name').val().length <= 24)"
             }
           },
           "avatars": {
             "$avatar": {
               ".write": "auth != null && ((newData.exists() && newData.val() === auth.uid && (!data.exists() || data.val() === auth.uid) && root.child('rooms').child($code).child('meta/status').val() === 'lobby') || (!newData.exists() && data.val() === auth.uid))",
               ".validate": "!newData.exists() || (newData.isString() && $avatar.matches(/^[a-z]{3,16}$/))"
             }
           },
           "scores": {
             "$round": {
               "$uid": {
                 ".write": "auth != null && auth.uid === $uid",
                 ".validate": "newData.hasChildren(['total', 'pitch', 'rhythm', 'points', 'clipMs'])"
               }
             }
           },
           "clips": {
             "$round": {
               "$uid": {
                 ".write": "auth != null && auth.uid === $uid",
                 ".validate": "newData.child('data').isString() && newData.child('data').val().length < 700000"
               }
             }
           },
           "reactions": {
             "$round": {
               "$target": {
                 "$id": {
                   ".write": "auth != null && !data.exists() && newData.child('from').val() === auth.uid",
                   ".validate": "newData.child('emoji').val().matches(/^(laugh|tomato|happy|scared)$/)"
                 }
               }
             }
           },
           "voice": {
             "peers": {
               "$uid": {
                 ".write": "auth != null && auth.uid === $uid && root.child('rooms').child($code).child('players').child(auth.uid).exists()",
                 ".validate": "!newData.exists() || newData.child('session').isString()"
               }
             },
             "mic": {
               "$uid": {
                 ".write": "auth != null && auth.uid === $uid && root.child('rooms').child($code).child('players').child(auth.uid).exists()",
                 ".validate": "newData.child('on').isBoolean() && newData.child('by').val() === auth.uid && (newData.child('on').val() === false || $uid === auth.uid)"
               }
             },
             "signals": {
               "$to": {
                 "$id": {
                   ".write": "auth != null && ((!data.exists() && newData.child('from').val() === auth.uid && root.child('rooms').child($code).child('players').child(auth.uid).exists()) || (!newData.exists() && auth.uid === $to))",
                   ".validate": "!newData.exists() || (newData.child('kind').val().matches(/^(offer|answer|ice)$/) && (!newData.child('sdp').exists() || newData.child('sdp').val().length < 30000) && (!newData.child('candidate').exists() || newData.child('candidate').val().length < 2000))"
                 }
               }
             }
           }
         }
       }
     }
   }
   ```

   Essas regras são a "segurança" do jogo: só o anfitrião avança a partida, cada jogador só mexe na própria nota,
   ninguém de fora apaga a sala dos outros, no chat de voz o anfitrião pode mutar alguém mas nunca ligar o
   microfone de outra pessoa um pack compartilhado só pode ser enviado (uma vez) por quem gerou o código e cada mascote só pode ser escolhido por um jogador da sala (antes de a partida começar).

## 3. Ligar o login anônimo

Os jogadores não precisam criar conta: o app entra como "visitante" sozinho. Para isso:

1. No menu da esquerda, abra **Criação** → **Authentication** e clique em **Vamos começar**.
2. Na aba **Método de login** (ou **Métodos de login**), clique em **Anônimo**.
3. Ative a chave e clique em **Salvar**.

## 4. Registrar o app e copiar a configuração

> Faça este passo **depois** do passo 2: assim a configuração já vem com o endereço do banco (`databaseURL`).

1. Clique na **engrenagem** ao lado de "Visão geral do projeto" → **Configurações do projeto**.
2. Role até **Seus apps** e clique no ícone **`</>`** (Web).
3. Apelido do app: `mimic-mobile`. **Não** marque "Firebase Hosting". Clique em **Registrar app**.
4. Vai aparecer um bloco de código parecido com este:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "mimic-mobile-xxxx.firebaseapp.com",
     databaseURL: "https://mimic-mobile-xxxx-default-rtdb.firebaseio.com",
     projectId: "mimic-mobile-xxxx",
     storageBucket: "mimic-mobile-xxxx.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

   Confira se tem a linha **`databaseURL`**. Se não tiver, volte ao passo 2 e depois abra de novo as Configurações
   do projeto (a configuração aparece lá, em "Seus apps").
5. **Copie tudo o que está entre as chaves `{ }`, incluindo as chaves.**

## 5. Me passar a configuração

Cole no chat o bloco copiado no passo 4.5 (um print da tela também serve). Eu coloco a configuração no app em
`src/online/firebaseConfig.ts`, testo com o projeto de verdade e gero o APK.

> Esses valores **não são senha** (diferente do token da Expo): eles só dizem ao app qual projeto usar e vão dentro
> do app de qualquer jeito. Quem protege os dados são as regras do passo 2.

**Já feito (set/2026):** o app usa o projeto `mimic-mobile-v3ltda`.

## Quando as regras mudarem (ex.: chat de voz, set/2026; packs compartilhados e mascotes, out/2026)

Se eu avisar que as regras mudaram, repita só o passo 2.5: **Realtime Database → Regras**, apague tudo, cole o bloco
atualizado acima e clique em **Publicar**. Sem isso, as partes novas (como o chat de voz, o compartilhamento de
packs e a escolha de mascotes) não funcionam.

---

## Depois de pronto

- **Todo mundo que for jogar precisa do APK novo** (mesma versão), instalado no próprio celular Android.
- Um cria a sala em **Jogar online → Criar sala** e manda o **código de 4 letras** (botão "Convidar amigos"); os
  outros entram em **Jogar online → Entrar numa sala**.
- Os dados de cada sala são apagados quando o anfitrião sai. O plano gratuito aguenta bem um grupo de amigos: cada
  imitação ocupa uns 80 KB.
- **Packs compartilhados** (`sharedPacks/{código}`) ficam guardados para os amigos baixarem quando quiserem: cada som
  ocupa de ~80 KB (1,4 s) a ~880 KB (15 s). O plano gratuito tem 1 GB de espaço e 10 GB de download por mês. Cada vez
  que um pack muda e é compartilhado de novo, o código antigo continua lá; para liberar espaço, apague os códigos
  velhos em **Realtime Database → Dados → sharedPacks** (o app não consegue apagar, porque o login anônimo muda a
  cada abertura).
- Quer acompanhar? No console do Firebase, **Realtime Database → Dados** mostra as salas abertas em tempo real.
