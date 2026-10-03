# Packs pessoais

Pasta para os **seus** packs (memes BR, memes gringos, trechos de anime, sons do grupo…) que vão
**dentro do app**, prontos ao abrir. É o equivalente aos packs da Steam Workshop do Mimic Party.

> ⚠️ **Uso privado.** Trechos de TV, filmes, anime, músicas e vozes de pessoas são protegidos por direito
> autoral e de imagem. Coloque aqui só o que for para o seu grupo, neste repositório **privado**. Um APK com
> esses sons **não pode ser publicado** (Play Store etc.) — para a versão pública, gere o app sem eles
> (veja abaixo). Os packs criados pelo editor dentro do app ficam só no celular e não passam por aqui.

## Pack pronto para usar: Animes & filmes

A pasta `animes-e-filmes/` já está criada, com o `pack.json`. Coloque ali os trechos (em português) e rode
o passo 4 abaixo. Enquanto a pasta não tiver áudios, o pack não aparece no app.

## Como adicionar um pack

1. Crie uma pasta por pack, por exemplo `packs-pessoais/memes-br/`.
2. Dentro dela, crie o arquivo `pack.json`:

   ```json
   { "title": "Memes BR", "description": "Clássicos da internet brasileira", "icon": "flame" }
   ```

   `icon` é opcional e usa os nomes do [Ionicons](https://icons.expo.fyi) (ex.: `flame`, `happy`, `skull`,
   `game-controller`, `planet`, `heart`, `star`, `musical-notes`).
3. Coloque os áudios na mesma pasta: **MP3, WAV, M4A, OGG, AAC, FLAC ou OPUS**. O **nome do arquivo vira o
   título** do som no jogo (`Ai_que_delicia.mp3` → "Ai que delicia").
4. Gere os sons (precisa de Python):

   ```bash
   cd mimic-mobile
   pip install numpy imageio-ffmpeg
   python3 scripts/build-sounds.py --so-pessoais
   ```

   Cada áudio é tratado como os sons oficiais: o silêncio é cortado, o volume é igualado e o som fica com
   **1,4 a 15 segundos** (se passar de 15 s, fica o trecho mais forte). Áudios que ficarem **com menos de 1,4 s**
   depois do corte são **descartados** (o script avisa): a gravação da imitação dura o mesmo tempo que o
   som. O resultado vai para `assets/sounds/pessoais/` e a lista para `src/audio/personalPacks.ts`.
5. Faça commit da pasta do pack, de `assets/sounds/pessoais/` e de `src/audio/personalPacks.ts`. Os packs
   aparecem na tela inicial com o selo **Pessoal**.

Dica: trechos marcantes de 2 a 4 s são os mais divertidos de imitar e os que o jogo avalia melhor.

## Versão pública, sem os packs pessoais

```bash
python3 scripts/build-sounds.py --sem-pessoais
```

Isso regenera tudo com a lista de packs pessoais vazia; os arquivos continuam na pasta, mas não entram no
app. Rode de novo sem a opção para trazê-los de volta.
