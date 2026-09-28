/**
 * Relógio da música. O relógio de áudio (`currentTime`) avança em blocos no Android, o que
 * deixaria a animação tremida; aqui ele é interpolado com `performance.now()` e corrigido
 * aos poucos para nunca se afastar do áudio.
 */
export class SongClock {
  private anchorPerf = 0;
  private anchorAudio = 0;
  private pausedAt: number | null = null;

  constructor(
    private readonly audioNow: () => number,
    /** Instante (relógio de áudio) do primeiro tempo do compasso 1. */
    private readonly startAt: number,
  ) {
    this.reanchor();
  }

  private reanchor() {
    this.anchorPerf = performance.now();
    this.anchorAudio = this.audioNow();
  }

  private estimate(): number {
    return this.anchorAudio + (performance.now() - this.anchorPerf) / 1000;
  }

  /** Tempo da música em segundos (negativo durante a contagem). */
  now(): number {
    if (this.pausedAt !== null) return this.pausedAt;
    return this.estimate() - this.startAt;
  }

  /** Chamar a cada quadro: aproxima a estimativa do relógio de áudio real. */
  sync() {
    if (this.pausedAt !== null) return;
    const drift = this.audioNow() - this.estimate();
    if (Math.abs(drift) > 0.05) this.reanchor();
    else this.anchorAudio += drift * 0.05;
  }

  pause() {
    if (this.pausedAt === null) this.pausedAt = this.now();
  }

  resume() {
    this.pausedAt = null;
    this.reanchor();
  }
}
