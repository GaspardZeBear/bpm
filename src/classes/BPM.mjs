import { Konsol } from './Konsol.mjs'
import { AutoCorrelator } from './AutoCorrelator.mjs'

class BPM {

  constructor(bpmDisplay, fftSize, audioContext) {

    // Variables globales pour la détection de BPM
    this.bpm = 0;
    this.fftSize = fftSize
    this.lastPeakTime = 0;
    this.peakHistory = [];
    this.bpmDisplay = bpmDisplay
    this.audioContext = audioContext
    //this.audioBufferHistory = [];
    //this.bufferSize = 4096;
    //this.id = 0
    //this.konsol = new Konsol("http://localhost:1961/log", 1000)
    this.autoCorrelator=new AutoCorrelator(2000,fftSize, audioContext)
  }

      //--------------------------------------------------------------------------------------------------
  // Fonction pour détecter le BPM n
  // dataArray contain tempral datas
  detectBPM(dataArray) {
    //this.id += 1
    this.autoCorrelator.addSample(dataArray)
    this.bpm=this.autoCorrelator.getBpm()
  }

}

export { BPM }