import { settings } from "./main";

const sounds = {
	dash: [
		{ sound: "dash/dash.wav", volume: 0.8 },
		{ sound: "dash/dash2.wav", volume: 0.8 },
	],
	hit: { sound: "hit.wav", volume: 0.2 },
	hurt: { sound: "hurt.wav", volume: 0.7 },
	kill: { sound: "kill.wav", volume: 0.2 },
	levelup: [
		{ sound: "levelup/levelup.wav" },
		{ sound: "levelup/levelup2.wav" },
		{ sound: "levelup/levelup3.wav" }
	],
	death: { sound: "death.wav", volume: 0.8 },
	border: { sound: "border.wav" }
}

const loadedSounds = {}

// Load sounds
for (let type in sounds) {
	if (Array.isArray(sounds[type])) {
		loadedSounds[type] = sounds[type].map(sound => new Audio("assets/sound/" + sound.sound));
		loadedSounds[type].forEach((audio, i) => audio.volume = sounds[type][i].volume || 1);
	} else {
		loadedSounds[type] = new Audio("assets/sound/" + sounds[type].sound);
		loadedSounds[type].volume = sounds[type].volume || 1;
	}
}

export function playSound(soundType) {
	if (settings.isMuted) return;
	
	if (sounds[soundType]) {
		if (Array.isArray(sounds[soundType])) {
			const randomSound = loadedSounds[soundType][Math.floor(Math.random() * loadedSounds[soundType].length)];
			randomSound.play();
		} else {
			loadedSounds[soundType].play();
		}
	} else {
		console.warn("Sound type not found: " + soundType);
	}
}