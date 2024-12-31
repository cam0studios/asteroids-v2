import { settings, settingsStore } from "./main";

const sounds = {
    dash: [
        { sound: "dash/dash.wav", volume: 0.8 },
        { sound: "dash/dash2.wav", volume: 0.8 },
    ],
    hit: { sound: "hit.wav", volume: 0.2 },
    hurt: { sound: "hurt.wav", volume: 0.7 },
    kill: { sound: "kill.wav", volume: 0.2 },
    levelup: { sound: "levelup.ogg" },
    death: { sound: "death.wav", volume: 0.8 },
    border: { sound: "border.wav", volume: 0.4 },
    shield: { sound: "shield.wav", volume: 0.7 },
    hover: { sound: "hover.wav", volume: 0.5 },
}

const loadedSounds = {}
let playbackIds = {}
let lastPlaybackId = 0;

// Load sounds
for (let type in sounds) {
    if (Array.isArray(sounds[type])) {
        loadedSounds[type] = sounds[type].map(sound => new Audio("assets/sound/" + sound.sound));
        loadedSounds[type].forEach((audio, i) => {
            const soundData = sounds[type][i]
            audio.volume = soundData.volume || 1
            audio.loop = soundData.loop || false
        });
    } else {
        loadedSounds[type] = new Audio("assets/sound/" + sounds[type].sound);
        loadedSounds[type].volume = sounds[type].volume || 1;
        loadedSounds[type].loop = sounds[type].loop || false;
    }
}

export function playSound(soundType) {
    if (settingsStore.get("isMuted")) return;
    
    if (sounds[soundType]) {
        let playingSound
        if (Array.isArray(sounds[soundType])) {
            const randomSound = loadedSounds[soundType][Math.floor(Math.random() * loadedSounds[soundType].length)];
            randomSound.play();
            playingSound = randomSound;
        } else {
            loadedSounds[soundType].play();
            playingSound = loadedSounds[soundType];
        }
        lastPlaybackId++;
        playbackIds[lastPlaybackId] = playingSound
        return lastPlaybackId
    } else {
        console.warn("Sound type not found: " + soundType);
        return null;
    }
}

export function stopSound(playbackId) {
    if (playbackIds[playbackId]) {
        playbackIds[playbackId].pause();
        playbackIds[playbackId].currentTime = 0;
        delete playbackIds[playbackId];
    }
}