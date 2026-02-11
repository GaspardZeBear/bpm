
import { BPM } from './classes/BPM.mjs';
import { Kick } from './classes/Kick.mjs';
// Variables globales
let audioContext;
let audioSource;
let analyser;
let kickAnalyser;
let canvasTimeCtx;
let canvasFreqCtx;
let canvasFreqFilterCtx;
let animationId;
let audioBuffer;
let startTime = 0;
let pauseTime = 0;
let isPlaying = false;
let bpm;
let kick
let frequencyLabels = [];


console.log("enter bpm.mjs")
// Initialisation

function startStopAudio() {
    window.addEventListener('click', () => {
        this.playMusic()
    }
    );
}


document.addEventListener('DOMContentLoaded', () => {
    const mp3Input = document.getElementById('mp3Input');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const seekSlider = document.getElementById('seekSlider');
    const timeDisplay = document.getElementById('timeDisplay');
    const canvasTime = document.getElementById('canvasTime');
    canvasTimeCtx = canvasTime.getContext('2d');
    const canvasFreq = document.getElementById('canvasFreq');
    canvasFreqCtx = canvasFreq.getContext('2d');
    const canvasFreqFilter = document.getElementById('canvasFreqFilter');
    canvasFreqFilterCtx = canvasFreqFilter.getContext('2d');

    // Initialiser le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;


    //const kickFilter = audioContext.createBiquadFilter();
    //kickFilter.type = 'bandpass';
    //kickFilter.type = 'lowpass';
    //kickFilter.frequency.value = 50; // Centre à 50 Hz (milieu de 40-60 Hz)
    //kickFilter.Q.value = 2.5; // 2.5 Bande passante étroite pour une plage de fréquences serrée
    kickAnalyser = audioContext.createAnalyser();
    kickAnalyser.fftSize = 2048;
    kickAnalyser.smoothingTimeConstant = 0.0; // Pas de lissage - veut des kicks bruts

    //bpm = new BPM(bpmDisplay, analyser.fftSize, audioContext)
    kick = new Kick(analyser.fftSize, audioContext)
    const kickFilter = kick.getFilter()

    // Gestionnaire pour le chargement du fichier MP3
    mp3Input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            audioContext.decodeAudioData(event.target.result)
                .then((buffer) => {
                    audioBuffer = buffer;
                    playButton.disabled = false;
                    seekSlider.disabled = false;
                    seekSlider.max = Math.floor(buffer.duration);
                    timeDisplay.textContent = `00:00 / ${formatTime(buffer.duration)}`;
                })
                .catch((err) => {
                    console.error("Erreur lors du décodage du fichier audio :", err);
                });
        };
        reader.readAsArrayBuffer(file);
    });

    // Lecture de l'audio
    playButton.addEventListener('click', () => {
        if (!audioBuffer) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        audioSource.connect(kick.getFilter());
        kick.getFilter().connect(kickAnalyser);

        if (pauseTime > 0) {
            audioSource.start(0, pauseTime);
        } else {
            audioSource.start(0, seekSlider.value);
        }

        startTime = audioContext.currentTime - (pauseTime || seekSlider.value);
        isPlaying = true;

        playButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;

        draw();
        updateSeekSlider();
    });

    // Pause de l'audio
    pauseButton.addEventListener('click', () => {
        if (audioSource) {
            audioSource.stop();
            pauseTime = audioContext.currentTime - startTime;
            isPlaying = false;
            cancelAnimationFrame(animationId);
            playButton.disabled = false;
            pauseButton.disabled = true;
        }
    });

    // Arrêter l'audio
    stopButton.addEventListener('click', () => {
        if (audioSource) {
            audioSource.stop();
            isPlaying = false;
            cancelAnimationFrame(animationId);
            pauseTime = 0;
            seekSlider.value = 0;
            timeDisplay.textContent = `00:00 / ${formatTime(audioBuffer.duration)}`;
            playButton.disabled = false;
            pauseButton.disabled = true;
            stopButton.disabled = true;
        }
    });

    // Mise à jour du curseur de recherche
    seekSlider.addEventListener('input', () => {
        if (isPlaying) {
            audioSource.stop();
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(analyser);
            analyser.connect(audioContext.destination);
            audioSource.start(0, seekSlider.value);
            startTime = audioContext.currentTime - seekSlider.value;
        }
    });

    // Redimensionnement du canvas
    window.addEventListener('resize', () => {
        canvasTime.width = canvasTime.parentElement.clientWidth;
        canvasTime.height = canvasTime.parentElement.clientHeight;
        canvasFreq.width = canvasFreq.parentElement.clientWidth;
        canvasFreq.height = canvasFreq.parentElement.clientHeight;
        canvasFreqFilter.width = canvasFreqFilter.parentElement.clientWidth;
        canvasFreqFilter.height = canvasFreqFilter.parentElement.clientHeight;
    });
    window.dispatchEvent(new Event('resize'));
});

// Mise à jour du curseur de recherche en temps réel
function updateSeekSlider() {
    if (!isPlaying) return;

    const currentTime = audioContext.currentTime - startTime;
    seekSlider.value = currentTime;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(audioBuffer.duration)}`;

    if (currentTime < audioBuffer.duration) {
        requestAnimationFrame(updateSeekSlider);
    } else {
        isPlaying = false;
        playButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
    }
}

// Formater le temps en mm:ss
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Fonction pour dessiner les données audio
function draw() {
    const canvasTime = document.getElementById('canvasTime');
    const canvasFreq = document.getElementById('canvasFreq');
    const canvasFreqFilter = document.getElementById('canvasFreqFilter');
    //const displayType = document.querySelector('input[name="displayType"]:checked').value;
    const bufferLength = analyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);
    const freqFilterDataArray = new Uint8Array(bufferLength);

    canvasTimeCtx.clearRect(0, 0, canvasTime.width, canvasTime.height);
    canvasFreqCtx.clearRect(0, 0, canvasFreq.width, canvasFreq.height);
    canvasFreqFilterCtx.clearRect(0, 0, canvasFreqFilter.width, canvasFreqFilter.height);

    analyser.getByteTimeDomainData(timeDataArray);
    drawTimeDomain('canvasTime', timeDataArray, bufferLength);

    kickAnalyser.getByteTimeDomainData(timeDataArray)
    kick.detectKick(timeDataArray)

    analyser.getByteFrequencyData(freqDataArray);
    drawFrequencyDomain('canvasFreq', freqDataArray, bufferLength);

    kickAnalyser.getByteFrequencyData(freqFilterDataArray);
    drawFrequencyFilterDomain('canvasFreqFilter', freqFilterDataArray, bufferLength);
    /*
    let selectedArray=new Uint8Array(bufferLength);
    for (let i=0; i<bufferLength;i++) {
        selectedArray[i]=0
    }
    for (let i=0; i<5;i++) {
        selectedArray[i]=freqFilterDataArray[i]
    }
    drawFrequencyFilterDomain('canvasFreqFilter', selectedArray, bufferLength);
    */
    if (kick.getKick()) {
        document.getElementById('bpmDisplay').innerHTML = `raw ${kick.getRawInterval()} BPM ${kick.getAvgBPM()}`
    } else {
        //document.getElementById('bpmDisplay').innerHTML="-"
    }

    animationId = requestAnimationFrame(draw);
}

// Dessiner le domaine temporel
function drawTimeDomain(canvasName, dataArray, bufferLength) {
    const canvas = document.getElementById(canvasName);
    canvasTimeCtx.lineWidth = 2;
    canvasTimeCtx.strokeStyle = 'rgb(0, 0, 0)';
    canvasTimeCtx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
            canvasTimeCtx.moveTo(x, y);
        } else {
            canvasTimeCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }
    canvasTimeCtx.lineTo(canvasTime.width, canvasTime.height / 2);
    canvasTimeCtx.stroke();
}

// Dessiner le domaine fréquentiel avec étiquettes de fréquence
function drawFrequencyDomain(canvasName, dataArray, bufferLength) {
    const canvas = document.getElementById(canvasName);
    const barWidth = (canvasFreq.width / bufferLength) * 2.5;
    let x = 0;
    // Effacer les anciennes étiquettes
    frequencyLabels.forEach(label => label.remove());
    frequencyLabels = [];
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255.0) * canvas.height;
        canvasFreqCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        canvasFreqCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        // Ajouter une étiquette de fréquence toutes les 20 barres
        if (i % 20 === 0) {
            const frequency = (i * audioContext.sampleRate) / analyser.fftSize;
            const label = document.createElement('div');
            label.className = 'freq-label';
            label.textContent = `${Math.round(frequency)} Hz`;
            label.style.left = `${x}px`;
            label.style.top = `${canvas.offsetTop + canvas.height - 20}px`;
            document.body.appendChild(label);
            frequencyLabels.push(label);
        }
        x += barWidth + 1;
    }
}


// Dessiner le domaine fréquentiel avec étiquettes de fréquence
function drawFrequencyFilterDomain(canvasName, dataArray, bufferLength) {
    const canvas = document.getElementById(canvasName);
    const barWidth = (canvasFreqFilter.width / bufferLength) * 2.5;
    let x = 0;
    // Effacer les anciennes étiquettes
    frequencyLabels.forEach(label => label.remove());
    frequencyLabels = [];
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255.0) * canvas.height;
        canvasFreqFilterCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        canvasFreqFilterCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        // Ajouter une étiquette de fréquence toutes les 20 barres
        if (i % 20 === 0) {
            const frequency = (i * audioContext.sampleRate) / analyser.fftSize;
            const label = document.createElement('div');
            label.className = 'freqFilter-label';
            label.textContent = `${Math.round(frequency)} Hz`;
            label.style.left = `${x}px`;
            label.style.top = `${canvas.offsetTop + canvas.height - 20}px`;
            document.body.appendChild(label);
            frequencyLabels.push(label);
        }
        x += barWidth + 1;
    }
}


