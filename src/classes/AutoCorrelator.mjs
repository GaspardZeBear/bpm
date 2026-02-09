import { Konsol } from './Konsol.mjs'

class AutoCorrelator {

  constructor(period, fftSize, audioContext) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.period=period
    this.audioContext = audioContext
    this.sampleRate = audioContext.sampleRate
    this.fftSize = fftSize
    this.sampleDuration = 2 * this.sampleRate / this.fftSize
    this.audioBufferHistory = [];
    this.bufferSize = 4096;
    this.id = 0
    this.prevSampleTime = 0
    this.prevAutoCorrelationTime = 0
    this.konsol = new Konsol("http://localhost:1961/log", 1000)
  }

  //-----------------------------------------
  autoCorrelate() {
    //let size = this.audioBufferHistory.length;
    //for (let i = 0; i < this.audioBufferHistory.length; i++) {
    //  if (isNaN(this.audioBufferHistory[i])) {
    //    this.audioBufferHistory[i] = 0
    //  }
    //  //console.log(`autoCorrelate() ${buffer.length} ${size} ${val} ${sumOfSquares}`)
    //}

    //console.log(` Correlation sample ${this.id} length ${this.audioBufferHistory.length} last ${Date.now() - this.prevAutoCorrelationTime}`)
    //this.konsol.httpLog(Date.now(), this.id, 'buffer', this.audioBufferHistory)
    let correlations = [];

    // Calculer la corrélation brute pour chaque lag
    let maxCorrelation = 0;
    let bestLag = 0;
    for (let lag = 0; lag < Math.round(this.audioBufferHistory.length/2); lag++) {
      let correlation = 0;
      for (let i = 0; i < this.audioBufferHistory.length - lag; i++) {
        correlation += this.audioBufferHistory[i] * this.audioBufferHistory[i + lag];
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
    //this.konsol.httpLog(Date.now(), this.id, 'correlations', correlations)
    //console.log(correlations)
    for (let lag= Math.round(correlations.length/3); lag < Math.round(correlations.length) ; lag++) { // Limiter la recherche aux lags pertinents
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        //console.log(`candidate maxCo ${maxCorrelation} bestLag ${bestLag}`)
        bestLag = lag;
      }
    }
    
    let correlationTime=bestLag*(Date.now() - this.prevAutoCorrelationTime)/this.audioBufferHistory.length
    //this.konsol.httpLog(Date.now(), this.id, 'correlation', `maxCo ${maxCorrelation} bestLag ${bestLag}`)

    // Calculer le BPM
    if (bestLag !== 0) {
      // Multiplier bestLag par un facteur pour obtenir la période complète
      const periodInSeconds = (bestLag * 4) / (this.sampleRate); // Facteur ajustable
      let bpm = 60 / periodInSeconds;
      console.log(`maxCo ${maxCorrelation} correlationTime ${correlationTime} bestLag ${bestLag} bpm ${bpm}`)
      return(bpm)
    }
    return 0;
  }


  //--------------------------------------------------------------------------------------------------
  // dataArray contains temporal datas
  addSample(dataArray) {
    this.id += 1
    let tmstp = Date.now()
    // discard first sample
    if ( this.prevSampleTime === 0 ) {
      this.prevSampleTime = tmstp
      return
    }
    let delta = tmstp - this.prevSampleTime 
    this.prevSampleTime = tmstp

    //let dataArrayArray = new Array(dataArray.length)
    //for (let i = 0; i < dataArray.length; i++) {
    //  dataArrayArray[i] = dataArray[i]
    //}
    //this.konsol.httpLog(Date.now(), this.id, 'dataArray', dataArrayArray)

  
    // buffer contains already registered datas (from previous sample)
    // Let's try to get rid of overlap by only keeping new datas
    // keep index is where new datas are (before, it's overlap)
    let keepIndex = Math.round(delta * this.sampleRate/1000)

    // may happen if too much time between samples !
    if (keepIndex > dataArray.length ) {
      this.audioBufferHistory=[]
      this.prevSampleTime = tmstp
      return
    }
    //console.log(`delta ${delta} index ${keepIndex} length ${dataArray.length}`)
    // Convertir les données en valeurs centrées autour de 0
    let buffer = new Float32Array(dataArray.length - keepIndex);
    //console.log(dataArray)
    //let bufferIdx=0
    for (let i = 0; i < buffer.length; i++) {
      let dataArrayIdx=keepIndex+i
      if (isNaN(dataArray[dataArrayIdx])) {
        buffer[i] = 0
      } else {
        //console.log(dataArray[dataArrayIdx])
        buffer[i] = (dataArray[dataArrayIdx] - 128) / 128.0; // Normaliser entre -1 et 1
        //console.log(`${i} ${dataArray[dataArrayIdxi]} ${buffer[bufferIdx]}`)
      }
      //bufferIdx += 1
    }
    //console.log(buffer)

    // Add to historical buffer
    this.audioBufferHistory.push(...buffer);
    //let accumTime = 2
    //let accumCount = accumTime * this.sampleRate
    let deltaAutoCorrelation = tmstp - this.prevAutoCorrelationTime
    //console.log(`index ${keepIndex} accumCount ${accumCount}`)
    //if (this.audioBufferHistory.length > accumCount) {
    if (deltaAutoCorrelation > this.period) {
      this.bpm = this.autoCorrelate();
      this.prevAutoCorrelationTime = tmstp
      this.audioBufferHistory = []
    }

  }
  getBpm() {
    return(this.bpm)
  }

}

export { AutoCorrelator }