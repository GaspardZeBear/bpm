import { Konsol } from './Konsol.mjs'

class Kick {

  constructor(fftSize, audioContext) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.fftSize = fftSize
    this.lastPeakTime = 0;
    this.detectedIntervals = [];
    this.audioContext = audioContext
    this.lastPeakAmplitude = 0
    this.baselineAmplitude = 0
    this.lastKickTime = 0
    this.lastBeatState = false
    this.id = 0
    this.isKick = false
    this.detectedBPM = 0
    this.movingAvgSize = 20
    this.kickFreeze = 300
    this.peakMinValue = 0.1
    this.rawInterval = 0
    this.jumpPercentage = 2
    this.setFilter()
  }

  //--------------------------------------------------------------------------------
  setFilter() {
    this.kickFilter = this.audioContext.createBiquadFilter();
    this.kickFilter.type = 'bandpass';
    //kickFilter.type = 'lowpass';
    this.kickFilter.frequency.value = 200; // Centre à 50 Hz (milieu de 40-60 Hz)
    this.kickFilter.Q.value = 10; // 2.5 Bande passante étroite pour une plage de fréquences serrée
  }

  //--------------------------------------------------------------------------------
  getFilter() {
    return(this.kickFilter)
  }


  //----------------------------------------------------------------
  getKick() {
    return (this.isKick)
  }

  //--------------------------------------------------------------------
  getAvgBPM() {
    if (this.detectedIntervals.length >= this.movingAvgSize) {
      const avgInterval = this.detectedIntervals.reduce((a, b) => a + b, 0) / this.detectedIntervals.length;
      this.detectedBPM = 60000 / avgInterval;
    }
    return (this.detectedBPM.toFixed(0))
  }

  //--------------------------------------------------------------------
  getRawInterval() {
    return (this.rawInterval.toFixed(3))
  }


  //--------------------------------------------------------------------------------------------------
  // dataArray contain temporal datas
  // Normally should be filtered by a lowPass filter
  detectKick(waveformData) {
    this.id += 1
    //console.log(`kick ${this.id}`);
    let peakAmplitude = 0;
    let avgAmplitude=0
    for (let i = 0; i < waveformData.length; i++) {
      const normalized = Math.abs((waveformData[i] - 128) / 128.0);
      avgAmplitude += normalized
      peakAmplitude = Math.max(peakAmplitude, normalized);
    }
    avgAmplitude=avgAmplitude/waveformData.length
    //console.log(`kick ${this.id} amplitude ${peakAmplitude}`);
    // Suivre la ligne de base (bruit de fond) - moyenne mobile lente
    //this.baselineAmplitude = this.baselineAmplitude * 0.95 + peakAmplitude * 0.05;
    this.baselineAmplitude = this.baselineAmplitude * 0.90 + avgAmplitude * 0.10;
    // Calculer le saut par rapport à la ligne de base
    const amplitudeJump = peakAmplitude - this.baselineAmplitude;
    const jumpPercentage = amplitudeJump / this.baselineAmplitude;


    const interval = Date.now() - this.lastKickTime;
    // Détecter la grosse caisse lorsque TOUTES les conditions sont remplies :
    this.isKick = (jumpPercentage >= this.jumpPercentage
      && peakAmplitude >= this.lastPeakAmplitude
      //&& peakAmplitude > this.peakMinValue
      && interval > this.kickFreeze)

    console.log(`kick ${this.id} amplitude ${peakAmplitude} baseAmplitude ${this.baselineAmplitude} interval ${interval}  lastPeak ${this.lastPeakAmplitude} jumpPercentage ${jumpPercentage} `);
    if (this.isKick) {
      this.rawInterval = interval;
      this.detectedIntervals.push(this.rawInterval);
      if (this.detectedIntervals.length > this.movingAvgSize) {
        this.detectedIntervals.shift();
      }
      console.log(`Boum ${peakAmplitude} Raw interval ${this.rawInterval} `);
      this.lastKickTime = Date.now()
    }
    this.lastPeakAmplitude = peakAmplitude
  }

}

export { Kick }