import Vector from "@cam0studios/vector-library";
import { particles, clampTime, calcBorder, sketch, settings, damagePlayer, currentLevel, player, enemies, time } from "./main";
import { playSound } from "./util/sound";

export const particleEnums = {
	explosion: 0,
	dashEffect: 1,
}

/**
 * Represents a type of particle.
 * @class
 */
class ParticleType {
	/**
	 * Creates an instance of ParticleType.
	 * @param {string} name - The name of the particle type.
	 * @param {Function} tick - The tick function for the particle type.
	 * @param {Function} draw - The draw function for the particle type.
	 * @param {Object} props - The properties of the particle type.
	 * @param {Function} [spawn] - The spawn function for the particle type.
	 */
	constructor({ name, tick, draw, props, defaults, spawn }) {
		this.name = name;
		this.tick = tick;
		this.draw = draw;
		this.props = props;
		this.defaults = defaults;
		if (spawn) this.spawn = spawn;
	}
	create(props) {
		let particle = {};
		for (let prop in this.props) {
			if (prop in props) particle[prop] = props[prop];
		}
		for (let prop in this.defaults) {
			let value;
			if (typeof this.defaults[prop] == "function") {
				value = this.defaults[prop](props, particle);
			} else {
				value = this.defaults[prop];
			}
			if (value instanceof Vector) {
				value = value.copy;
			}
			particle[prop] = value;
		}
		for (let prop of this.props) {
			if (prop in props) particle[prop] = props[prop];
		}
		particle.tick = this.tick;
		particle.draw = this.draw;
		particle.enemyTick = this.enemyTick;
		particles.push(particle);
		if ("spawn" in this) this.spawn(particle);
		return particle;
	}
}

const particleTypes = [
	new ParticleType({
		name: "Explosion",
		props: ["pos", "size", "maxSize"],
		defaults: {},
		tick: (particle, i) => {
			if (particle.size > particle.maxSize) {
				particles.splice(i, 1);
				i--;
			} else {
				particle.size += clampTime * 30 * Math.sqrt(particle.maxSize);
			}
		},
		draw: (particle) => {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", particle.pos.x, particle.pos.y);
			} else {
				sketch.fill(250);
				sketch.stroke(200);
				sketch.strokeWeight(particle.maxSize * 0.5);
				sketch.ellipse(particle.pos.x, particle.pos.y, particle.size * 2, particle.size * 2);
			}
		}
	}),
	new ParticleType({
		name: "Dash Effect",
		props: ["pos", "type"],
		defaults: {
			progress: 0,
			type: 0
		},
		tick: (particle, i) => {
			if (particle.type == 0) {
				particle.progress += clampTime * 5;
			} else {
				particle.progress += clampTime * 3;
				if (player.dodgeTime > 0) {
					particle.progress = 1;
				}
			}
			if (particle.progress >= 1) {
				particles.splice(i, 1);
				i--;
			}
		},
		draw: (particle) => {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", particle.pos.x, particle.pos.y);
			} else {
				let alpha;
				let col = 150;
				if (particle.type == 0) {
					alpha = (1 - particle.progress) * (settings.dimBg ? 0.05 : 0.25);
					if (alpha < 0) alpha = 0;
					if (alpha > 1) alpha = 1;
				} else {
					alpha = (1 - particle.progress) * 0.01;
					if (alpha < 0) alpha = 0;
					if (alpha > 1) alpha = 1;
					col = 100;
				}
				alpha = Math.round(alpha * 100) / 100;
				sketch.fill(`rgba(${col}, ${col}, ${col}, ${alpha})`);
				sketch.noStroke();
				sketch.circle(particle.pos.x, particle.pos.y, 30 + particle.progress * 40);
			}
		}
	})
];

export default particleTypes;

export function explode(pos, size) {
	particleTypes[particleEnums.explosion].create({
		pos,
		size: 0,
		maxSize: size
	});
}