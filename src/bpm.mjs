
import { BPM } from './classes/BPM.mjs';
// Variables globales
let audioContext;
let audioSource;
let analyser;
let canvasCtx;
let animationId;
let audioBuffer;
let startTime = 0;
let pauseTime = 0;
let isPlaying = false;
let bpm;
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
    const canvas = document.getElementById('canvas');
    canvasCtx = canvas.getContext('2d');

    // Initialiser le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bpm = new BPM(bpmDisplay, analyser.fftSize, audioContext)

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
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
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
    const canvas = document.getElementById('canvas');
    const displayType = document.querySelector('input[name="displayType"]:checked').value;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (displayType === 'time') {
        analyser.getByteTimeDomainData(dataArray);
        bpm.detectBPM(dataArray);
        drawTimeDomain(dataArray, bufferLength);
    } else {
        analyser.getByteFrequencyData(dataArray);
        drawFrequencyDomain(dataArray, bufferLength);
    }

    animationId = requestAnimationFrame(draw);
}

// Dessiner le domaine temporel
function drawTimeDomain(dataArray, bufferLength) {
    const canvas = document.getElementById('canvas');
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
    canvasCtx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}

// Dessiner le domaine fréquentiel avec étiquettes de fréquence
function drawFrequencyDomain(dataArray, bufferLength) {
    const canvas = document.getElementById('canvas');
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    // Effacer les anciennes étiquettes
    frequencyLabels.forEach(label => label.remove());
    frequencyLabels = [];
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255.0) * canvas.height;
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        // Ajouter une étiquette de fréquence toutes les 20 barres
        if (i % 20 === 0) {
            const frequency = (i * audioContext.sampleRate) / analyser.fftSize;
            const label = document.createElement('div');
            label.className = 'frequency-label';
            label.textContent = `${Math.round(frequency)} Hz`;
            label.style.left = `${x}px`;
            label.style.top = `${canvas.offsetTop + canvas.height - 20}px`;
            document.body.appendChild(label);
            frequencyLabels.push(label);
        }
        x += barWidth + 1;
    }
}


