//-----------------------------------------
class AutoCorrelator {

  constructor(sampleRate, bufferSize) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.audioBufferHistory = [];
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate
    this.id = 0
  }


  autoCorrelate(buffer) {
    let size = buffer.length;
    for (let i = 0; i < size; i++) {
      if (isNaN(buffer[i])) {
        buffer[i] = 0
      }
    }

    let correlations = [];

    let maxCorrelation = 0;
    let bestLag = 0;
    for (let lag = 0; lag < size / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < size - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = correlation;
      //console.log(`autoCorrelate() lag ${lag} ${correlations[lag]}`)
    }
    //console.log(`${correlations}`)
    for (let i = 1; i < correlations.length; i++) {
      console.log(`autoCorrelate() correlation for lag ${i} ${correlations[i].toFixed(2)}`)
    }

    for (let lag = 40; lag < 200; lag++) { // Limiter la recherche aux lags pertinents
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        bestLag = lag;
      }
    }
    console.log(`autoCorrelate() maxCo ${maxCorrelation} bestLag ${bestLag}`)
    //this.konsol.httpLog(Date.now(), this.id, 'correlation', `maxCo ${maxCorrelation} bestLag ${bestLag}`)

    // Calculer le BPM
    if (bestLag !== 0) {
      // Multiplier bestLag par un facteur pour obtenir la période complète
      const periodInSeconds = (bestLag * 4) / (this.sampleRate); // Facteur ajustable
      return 60 / periodInSeconds;
    }
    return 0;
  }


  //--------------------------------------------------------------------------------------------------
  // Fonction pour détecter le BPM avec autocorrélation
  autoDetectBPM(dataArray) {
    let buffer = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      buffer[i] = dataArray[i]
    }
    this.audioBufferHistory.push(...buffer);
    if (this.audioBufferHistory.length > this.bufferSize * 2) {
      this.audioBufferHistory = this.audioBufferHistory.slice(-this.bufferSize * 2);
    }
    // Calculer le BPM si on a assez de donnéesf
    if (this.audioBufferHistory.length >= this.bufferSize * 2) {
      let bpmValue = this.autoCorrelate(this.audioBufferHistory, this.sampleRate);
      this.bpm = bpmValue;
    } else {
      console.log(`autoDetectBPM() Not enough data ${this.audioBufferHistory.length}`)
    }
  }

}


//-----------------------------------------------------------------------------------------
let data = []
let data1 = []
let freq = 50
let lasting = 5
let sampling = 2 * freq
let sampleInterval = 1 / sampling
for (let t = 0; t < lasting; t += sampleInterval) {
  //console.log(`${t} ${Math.sin(t)}`)
  data.push(Math.sin(t))
  data1.push(Math.sin(t)+Math.random())
  //data.push(Math.random())
  /data1.push(Math.random())
}
console.log(`data length ${data.length} interval ${sampleInterval}`)
for (let i = 0; i < data.length; i++) {
  console.log(`${i} data ${data[i].toFixed(2)} data1 ${data1[i].toFixed(2)}`)
}

let K = new AutoCorrelator(data.length * 2, sampling)
//for (let i = 0; i < 10; i++) {
  K.autoDetectBPM(data)
  K.autoDetectBPM(data1)
//}



