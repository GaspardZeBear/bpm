import { Konsol } from './Konsol.mjs'

class Kick {

  constructor(bpmDisplay, fftSize, audioContext) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.fftSize = fftSize
    this.lastPeakTime = 0;
    this.detectedIntervals = [];
    this.bpmDisplay = bpmDisplay
    this.audioContext = audioContext
    this.lastPeakAmplitude = 0
    this.baselineAmplitude = 0
    this.lastKickTime = 0
    this.lastBeatState = false
    this.id = 0
  }

  //--------------------------------------------------------------------------------------------------
  // Fonction pour détecter le BPM n
  // dataArray contain tempral datas
  detectBPM(waveformData) {
    this.id += 1
    //console.log(`kick ${this.id}`);
    let peakAmplitude = 0;
    for (let i = 0; i < waveformData.length; i++) {
      const normalized = Math.abs((waveformData[i] - 128) / 128.0);
      peakAmplitude = Math.max(peakAmplitude, normalized);
    }
    //console.log(`kick ${this.id} amplitude ${peakAmplitude}`);
    // Suivre la ligne de base (bruit de fond) - moyenne mobile lente
    this.baselineAmplitude = this.baselineAmplitude * 0.95 + peakAmplitude * 0.05;
    // Calculer le saut par rapport à la ligne de base
    const amplitudeJump = peakAmplitude - this.baselineAmplitude;
    const jumpPercentage = amplitudeJump / this.baselineAmplitude;

    const interval = Date.now() - this.lastKickTime;
    // Détecter la grosse caisse lorsque TOUTES les conditions sont remplies :
    const isKick = (jumpPercentage >= 0.20 // Saut de 20 % et plus
      && peakAmplitude > this.lastPeakAmplitude // Front montant
      && interval >= 300 // Refroidissement de 150 ms
      && peakAmplitude > 0.1) // Minimum absolu

    //console.log(`kick ${this.id} amplitude ${peakAmplitude} interval ${interval}  lastPeak ${this.lastPeakAmplitude} jumpPercentage ${jumpPercentage} `);
    if (isKick) {
      console.log(`Boum ${peakAmplitude} ${interval}`);
      // Ajouter à la moyenne mobile (30 derniers kicks)
      this.detectedIntervals.push(interval);
      if (this.detectedIntervals.length > 30) {
        this.detectedIntervals.shift();
      }
      // Calculer le BPM à partir de l'intervalle moyen
      const avgInterval = this.detectedIntervals.reduce((a, b) => a + b, 0) / this.detectedIntervals.length;
      //const detectedBPM = Math.round(60 / avgInterval)
      const detectedBPM = 60000 / avgInterval;
      console.log(`Boum ${peakAmplitude} ${interval} bpm ${detectedBPM}`);
      this.lastKickTime = Date.now()
      this.bpmDisplay = interval
    }
    this.lastPeakAmplitude = peakAmplitude
  }

}

export { Kick }