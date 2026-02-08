import { Konsol } from './Konsol.mjs'

class BPM {

  constructor(bpmDisplay, audioContext) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.lastPeakTime = 0;
    this.peakHistory = [];
    //this.bpmDisplay = document.createElement('div');
    this.bpmDisplay = bpmDisplay
    //this.bpmDisplay.id = 'bpmDisplay';
    //this.bpmDisplay.style.marginTop = '10px';
    //this.bpmDisplay.style.fontSize = '20px';
    this.audioContext = audioContext
    //document.body.insertBefore(this.bpmDisplay, document.getElementById('visualizer'));
    this.audioBufferHistory = [];
    this.bufferSize = 4096;
    this.id = 0
    this.konsol = new Konsol("http://localhost:1961/log", 1000)
  }

  // Fonction pour détecter les BPM
  detectBPM(dataArray) {
    //console.log(`BPM.detectBPM() `)
    const now = this.audioContext.currentTime;
    const averageEnergy = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    //const isPeak = dataArray[0] > 1.5 * averageEnergy; // Seuil pour détecter un pic
    const isPeak = 128

    if (isPeak && now - this.lastPeakTime > 0.1) { // Éviter les doubles détections
      const interval = now - this.lastPeakTime;

      if (this.lastPeakTime !== 0) {
        const currentBPM = 60 / interval;
        this.peakHistory.push(currentBPM);
        if (this.peakHistory.length > 10) {
          this.peakHistory.shift(); // Garder les 10 dernières valeurs
        }
        // Calculer la moyenne des BPM
        this.bpm = this.peakHistory.reduce((sum, bpm) => sum + bpm, 0) / this.peakHistory.length;
        this.bpmDisplay.textContent = `BPM détecté : ${Math.round(this.bpm)}`;
        console.log(`BPM détecté : ${Math.round(this.bpm)}`)
      }
      this.lastPeakTime = now;
    }
  }

  //--------------------------------------------------------------------------------------------------
  // Fonction pour calculer l'autocorrélation
  XautoCorrelate(buffer, sampleRate) {
    let size = buffer.length;
    let sumOfSquares = 0;
    //console.log(buffer)
    for (let i = 0; i < size; i++) {
      let val = buffer[i];
      if (!isNaN(val)) {
        sumOfSquares += val * val;
      } else {
        buffer[i] = 0
      }
      //console.log(`autoCorrelate() ${buffer.length} ${size} ${val} ${sumOfSquares}`)
    }
    //console.log(`autoCorrelate() ${buffer.length} ${size}  ${sumOfSquares}`)
    let correlations = [];
    for (let lag = 0; lag < size / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < size - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = correlation / Math.sqrt(sumOfSquares);
    }

    //console.log(correlations)
    // Trouver le lag avec la plus forte corrélation
    let maxCorrelation = 0;
    let bestLag = 0;
    for (let lag = 40; lag < 200; lag++) { // Limiter la recherche aux lags pertinents pour le BPM
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    console.log(`maxCo ${maxCorrelation} bestLag ${bestLag}`)

    // Calculer le BPM
    if (bestLag !== 0) {
      // Multiplier bestLag par 4 pour obtenir la période complète (ajustable selon le morceau)
      const periodInSeconds = (bestLag * 4) / sampleRate;
      return 60 / periodInSeconds;
    }
    return 0;
  }

  //-----------------------------------------
  autoCorrelate(buffer, sampleRate) {
    let size = buffer.length;
    for (let i = 0; i < size; i++) {
      if (isNaN(buffer[i])) {
        buffer[i] = 0
      }
      //console.log(`autoCorrelate() ${buffer.length} ${size} ${val} ${sumOfSquares}`)
    }
    this.konsol.httpLog(Date.now(), this.id, 'buffer', buffer)
    let correlations = [];

    // Calculer la corrélation brute pour chaque lag
    let maxCorrelation = 0;
    let bestLag = 0;
    for (let lag = 0; lag < size / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < size - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = correlation;
      //if (correlations[lag] > maxCorrelation) {
      //  maxCorrelation = correlations[lag];
      //  bestLag = lag;
      //}
    }

    // Trouver le lag avec la plus forte corrélation

    /*
    let maxCorrelation = 0;
    let bestLag = 0;
    */
   this.konsol.httpLog(Date.now(), this.id, 'correlations', correlations)
    for (let lag = 40; lag < 200; lag++) { // Limiter la recherche aux lags pertinents
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    console.log(`maxCo ${maxCorrelation} bestLag ${bestLag}`)
    this.konsol.httpLog(Date.now(), this.id, 'correlation', `maxCo ${maxCorrelation} bestLag ${bestLag}`)

    // Calculer le BPM
    if (bestLag !== 0) {
      // Multiplier bestLag par un facteur pour obtenir la période complète
      const periodInSeconds = (bestLag * 4) / (sampleRate); // Facteur ajustable
      return 60 / periodInSeconds;
    }
    return 0;
  }


  //--------------------------------------------------------------------------------------------------
  // Fonction pour détecter le BPM avec autocorrélation
  autoDetectBPM(dataArray) {
    this.id += 1

    let dataArrayArray = new Array(dataArray.length)
    for (let i = 0; i < dataArray.length; i++) {
      dataArrayArray[i] = dataArray[i]
    }
    //this.konsol.httpLog(Date.now(), this.id, 'dataArray', dataArrayArray)
    //console.log(dataArray)
    //console.log(dataArrayArray)
    this.konsol.httpLog(Date.now(), this.id, 'dataArray', dataArrayArray)

    // Convertir les données en valeurs centrées autour de 0
    let buffer = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      buffer[i] = (dataArray[i] - 128) / 128.0; // Normaliser entre -1 et 1
    }
    //console.log(buffer)
    // Ajouter au buffer historique
    this.audioBufferHistory.push(...buffer);
    if (this.audioBufferHistory.length > this.bufferSize * 2) {
      this.audioBufferHistory = this.audioBufferHistory.slice(-this.bufferSize * 2);
    }

    // Calculer le BPM si on a assez de données
    if (this.audioBufferHistory.length >= this.bufferSize * 2) {
      let bpmValue = this.autoCorrelate(this.audioBufferHistory, this.audioContext.sampleRate);
      //console.log(`bpmValue ${bpmValue}`)
      //if (bpmValue > 50 && bpmValue < 200) { // Filtrer les valeurs aberrantes
      this.bpm = bpmValue;
      this.bpmDisplay.textContent = `BPM autocorelated : ${Math.round(this.bpm)}`;
      //}
    }
  }

}

export { BPM }