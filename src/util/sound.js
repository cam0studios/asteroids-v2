import { player, settings, settingsStore } from "../main";
import sounds from '../data/sounds.json';

window.AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioContext = new AudioContext(); // Will be resumed when the start button is pressed
const context = audioContext

// Modified from https://stackoverflow.com/questions/25654558/76916935#76916935
export class Sound {
	url = '';
	buffer = null;
	sources = [];
	data = {}

	constructor(url, data) {
		this.url = url;
		this.data = data;
	}

	load() {
		if (!this.url) return Promise.reject(new Error('Missing or invalid URL: ', this.url));
		if (this.buffer) return Promise.resolve(this.buffer);

		return new Promise((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.open('GET', this.url, true);
			request.responseType = 'arraybuffer';

			// Decode asynchronously:
			request.onload = () => {
				context.decodeAudioData(request.response, (buffer) => {
					if (!buffer) {
						console.warn(`Sound decoding error: ${ this.url }`);
						reject(new Error(`Sound decoding error: ${ this.url }`));
						return;
					}
					this.buffer = buffer;
					resolve(buffer);
				});
			};
			request.onerror = (err) => {
				console.warn('Error loading sound:', err);
				reject(err);
			};
			request.send();
		});
	}

	play(volume = 1, time = 0) {
		if (!this.buffer) return;
		if (this.data.debounce && this.sources.length > 0) return;
		const source = context.createBufferSource();
		source.buffer = this.buffer;

		volume *= settingsStore.get("volume", 1)

		// Keep track of all sources created, and stop tracking them once they finish playing:
		const insertedAt = this.sources.push(source) - 1;
		source.onended = () => {
			source.stop(0);
			if (this.data.cooldown) {
				setTimeout(() => {
					this.sources.splice(insertedAt, 1);
				}, this.data.cooldown);
			} else {
				this.sources.splice(insertedAt, 1);
			}
			if (this.data.loop) {
				this.play(volume, time)
			}
		};

		const gainNode = context.createGain();
		gainNode.gain.value = volume;

		source.connect(gainNode).connect(context.destination);
		source.start(time);
		return true
	}

	stop() {
		this.sources.forEach((source) => {
			source.stop(0);
		});
		this.sources = [];
	}
}

const loadedSounds = {}
let playbackIds = {}
let lastPlaybackId = 0;

function getFullSoundUrl(sound) {
	if (sound.startsWith("data:")) return sound;
	return "assets/sound/" + sound;
}

// Load sounds
for (let type in sounds) {
	if (Array.isArray(sounds[type])) {
		loadedSounds[type] = sounds[type].map(sound => new Sound(getFullSoundUrl(sound.sound), sound));
		loadedSounds[type].forEach((audio, i) => {
			audio.load()
			// const soundData = sounds[type][i]
		});
	} else {
		loadedSounds[type] = new Sound(getFullSoundUrl(sounds[type].sound), sounds[type]);
		loadedSounds[type].load()
	}
}

export function playSound(soundType, position, cancelable = false) {	
	let distance
	let volume = sounds[soundType].volume || 1
	if (position) {
		distance = position["-"](player.pos).mag
	}
	if (distance && sounds[soundType].rolloff) {
		const rolloff = sounds[soundType].rolloff
		volume = Math.max(0, Math.min(sounds[soundType].volume * (1 - distance / rolloff), 1))
	}

	if (sounds[soundType]) {
		let playingSound
		let response
		if (Array.isArray(sounds[soundType])) {
			const randomSound = loadedSounds[soundType][Math.floor(Math.random() * loadedSounds[soundType].length)];
			response = randomSound.play(volume);
			playingSound = randomSound;
		} else {
			response = loadedSounds[soundType].play(volume);
			playingSound = loadedSounds[soundType];
		}
		if (response !== true) return
		if (!cancelable) return
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
		playbackIds[playbackId].stop();
		delete playbackIds[playbackId];
	}
}