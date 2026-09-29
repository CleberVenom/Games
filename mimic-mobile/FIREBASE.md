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
           }
         }
       }
     }
   }
   ```

   Essas regras são a "segurança" do jogo: só o anfitrião avança a partida, cada jogador só mexe na própria nota e
   ninguém de fora apaga a sala dos outros.

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

---

## Depois de pronto

- **Todo mundo que for jogar precisa do APK novo** (mesma versão), instalado no próprio celular Android.
- Um cria a sala em **Jogar online → Criar sala** e manda o **código de 4 letras** (botão "Convidar amigos"); os
  outros entram em **Jogar online → Entrar numa sala**.
- Os dados de cada sala são apagados quando o anfitrião sai. O plano gratuito aguenta bem um grupo de amigos: cada
  imitação ocupa uns 80 KB.
- Quer acompanhar? No console do Firebase, **Realtime Database → Dados** mostra as salas abertas em tempo real.
