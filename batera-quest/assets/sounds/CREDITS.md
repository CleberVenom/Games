# Créditos dos sons

Todos os sons de bateria do app são **gravações reais de instrumentos acústicos**, em domínio público
(**Creative Commons 0**). Nenhum som é sintetizado.

| Pasta | Origem | Licença |
|---|---|---|
| `acustico/` | Gravações de [freesound.org](https://freesound.org) por **menegass** (kit acústico: bumbo, caixa, tons, chimbal, ataque), distribuídas pelo projeto [Sonic Pi](https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples) | CC0 |
| `estudio/` | [VCSL – Versilian Community Sample Library](https://github.com/sgossner/VCSL) (caixa "Modern 1", tons, chimbal, pratos suspensos) — Versilian Studios | CC0 |
| `metal/kick_1.wav` | "drum_heavy_kick" de freesound.org por **Zajo**, via Sonic Pi | CC0 |
| `comum/stick_*.wav` | Clique de baqueta no aro (cross-stick) da VCSL, usado na contagem e no metrônomo | CC0 |

Processamento (script `scripts/build-samples.py`): mono, corte do silêncio inicial (o ataque começa
exatamente no início do arquivo, importante para o timing do jogo), corte da cauda com fade-out,
normalização em −1 dBFS e WAV 16-bit/44,1 kHz. O "Tom 2" do kit Studio é o tom 1 da VCSL afinado
3 semitons abaixo, como um sampler faria.

CC0 não exige atribuição, mas mantemos este registro por transparência.
