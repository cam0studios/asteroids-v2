import Vector from "@cam0studios/vector-library";
import { rumble } from "./gamepad";
import { enemies, clampTime, applyBorder, projectiles, player, getOnScreen, sketch, get, set, settings, damagePlayer, currentLevel, getRandomBox, calcBorder } from "./main";
import projectileTypes, { projectileEnums } from "./projectile-types";
import particleTypes, { explode } from "./particle-types";
import { playSound } from './util/sound';

/**
 * Represents an enemy type.
 * @class
 */
class EnemyType {
	/**
	 * Creates an instance of EnemyType.
	 * @param {string} name - The name of the enemy type.
	 * @param {string[]} props - The properties to pass in to the enemy type.
	 * @param {object} defaults - The default properties and values for the enemy type.
	 * @param {Function} tick - The tick function for the enemy type.
	 * @param {Function} beforeDraw - The beforeDraw function for the enemy type.
	 * @param {Function} afterDraw - The afterDraw function for the enemy type.
	 * @param {Function} [spawn] - The spawn function for the enemy type.
	 */
	constructor({ name, props, defaults, tick, beforeDraw, afterDraw, spawn }) {
		this.name = name;
		this.props = props;
		this.defaults = defaults;
		this.tick = tick;
		this.beforeDraw = beforeDraw;
		this.afterDraw = afterDraw;
		if (spawn) this.spawn = spawn;
	}
	create(props) {
		let enemy = {};
		for (let prop in this.props) {
			if (prop in props) enemy[prop] = props[prop];
		}
		for (let prop in this.defaults) {
			let value;
			if (typeof this.defaults[prop] == "function") {
				value = this.defaults[prop](props, enemy);
			} else {
				value = this.defaults[prop];
			}
			if (value instanceof Vector) {
				value = value.copy;
			}
			enemy[prop] = value;
		}
		for (let prop of this.props) {
			if (prop in props) enemy[prop] = props[prop];
		}
		enemy.tick = this.tick;
		enemy.beforeDraw = this.beforeDraw;
		enemy.afterDraw = this.afterDraw;
		enemies.push(enemy);
		if ("spawn" in this) this.spawn(enemy);
		return enemy;
	}
}

const enemyTypes = [
	new EnemyType({
		name: "Asteroid",
		props: ["mode", "pos", "vel", "size", "spawn", "hp", "speed", "maxHp", "burning", "frozen", "effectTime"],
		defaults: {
			type: 0,
			id: () => Math.floor(Math.random() * 1e6),
			pos: ({ mode }) => mode == 0 ? getPosAroundPlayer() : mode == 1 ? getRandomBox(currentLevel.size) : Vector.zero,
			vel: () => new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI),
			hp: ({ size }) => size > 30 ? 5 : size > 15 ? 3 : size > 10 ? 2 : 1,
			speed: () => 10 + Math.random() * 30,
			spawn: ({ mode }) => mode == 0 ? false : mode == 1 ? true : false,
			hitDir: () => Math.random() * 2 * Math.PI,
			time: 0,
			effectTime: 0,
			burning: false,
			frozen: false,
			maxHp: ({ }, { hp }) => hp
		},
		tick: (enemy, i) => {
			defaultTick(enemy, i, { burnTime: 15, burnOffset: 0.5 });

			if (enemy.time > 1 || !enemy.spawn) {
				if (enemy.hp <= 0) {
					enemies.splice(i, 1);
					i--;
					player.kills++;
					playSound("kill", enemy.pos);
					if (enemy.size > 10) {
						for (let rot = -1; rot <= 1; rot += 1) {
							let newEnemy = {
								pos: enemy.pos.copy,
								vel: (enemy.vel)["+"](new Vector(50, 0).rotate(enemy.hitDir + rot)),
								size: enemy.size * 2 / 3,
								mode: 0
							};
							if (enemy.burning) {
								newEnemy.burning = true;
								newEnemy.effectTime = enemy.effectTime / 3;
							}
							if (enemy.frozen) {
								newEnemy.frozen = true;
								newEnemy.effectTime = enemy.effectTime / 3;
							}
							enemyTypes[0].create(newEnemy);
						}
					}
					let newScreenshake = (enemy.size > 20 ? 12 : 7) / ((enemy.pos)["-"](player.pos).mag / 500 + 1);
					if (get("screenshake") < newScreenshake) {
						set("screenshake", newScreenshake);
					} else {
						set("screenshake", get("screenshake") + newScreenshake / 5);
					}
					player.xp += enemy.size > 15 ? 5 : 3;
					player.score += enemy.size > 15 ? 5 : enemy.size > 10 ? 3 : 1;
					rumble(enemy.size > 15 ? 0.15 : enemy.size > 10 ? 0.1 : 0.05, enemy.size > 15 ? 0.5 : enemy.size > 10 ? 0.4 : 0.3);
					explode(enemy.pos, enemy.size > 15 ? 30 : enemy.size > 10 ? 20 : 10);
				}
			}
		},
		beforeDraw: (enemy) => {
			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {

					} else {

					}
				} else {
					sketch.fill(`rgba(150,50,0,${enemy.time * 0.5})`);
					sketch.stroke(`rgba(200,50,0,${enemy.time * 1})`);
					sketch.strokeWeight(5);
					sketch.circle(enemy.pos.x, enemy.pos.y, enemy.size * 2);
				}
			}
		},
		afterDraw: (enemy) => {
			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {
						sketch.push();
						sketch.textAlign("center", "center");
						sketch.textSize(enemy.size * 2);
						sketch.translate(enemy.pos.x, enemy.pos.y);
						sketch.rotate(enemy.vel.heading);
						sketch.text("⭐", 0, 0);
						sketch.pop();
					} else {
						sketch.fill(0);
						sketch.stroke(255);

						if (enemy.frozen) sketch.stroke(35, 178, 246)
						if (enemy.burning) sketch.stroke(230, 102, 72)

						sketch.strokeWeight(5);
						sketch.ellipse(enemy.pos.x, enemy.pos.y, enemy.size * 2, enemy.size * 2);
					}
				} else {

				}
			}
		}
	}),
	new EnemyType({
		name: "Turret",
		props: ["mode", "pos", "vel", "spawn", "hp", "index", "max", "range"],
		defaults: {
			type: 1,
			id: () => Math.floor(Math.random() * 1e6 + 1e6),
			pos: ({ mode }) => mode == 0 ? getPosAroundPlayer() : mode == 1 ? getRandomBox(currentLevel.size) : Vector.zero,
			vel: () => new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI),
			hp: 15,
			maxHp: ({ }, { hp }) => hp,
			size: 20,
			hitDir: () => Math.random() * 2 * Math.PI,
			time: 0,
			reloadTime: 5,
			cooldown: 0,
			cooldownTime: 1.5,
			reload: ({ index, max }, { reloadTime, cooldownTime }) => {
				console.debug(index, max, reloadTime, cooldownTime);
				return ((index + (Math.random() - 0.5) * 0.5) * 2 + 1) / (max * 2) * (reloadTime + cooldownTime)
			},
			spawn: false,
			dir: 0,
			aiming: Vector.zero,
			effectTime: 0,
			burning: false,
			frozen: false,
			range: 1000,
			// reload: 0
		},
		tick: (enemy, i) => {
			defaultTick(enemy, i, { burnTime: 20, burnOffset: 0.5, move: false });

			if (enemy.time > 1 || !enemy.spawn) {
				if (enemy.cooldown > 0) {
					enemy.cooldown -= clampTime;
				} else if (enemy.pos["-"](player.pos).mag < enemy.range && !enemy.frozen) {
					enemy.reload -= clampTime;
					let aim = (player.pos)["-"](enemy.pos);
					aim["+="]((player.vel)["*"](0.7));
					aim.mag = 1;
					enemy.aiming["*="](Math.pow(1e-3, clampTime));
					enemy.aiming["+="](aim);
					// enemy.aiming = d;
					enemy.dir = enemy.aiming.heading;
					if (enemy.reload <= 0) {
						enemy.reload = enemy.reloadTime;
						enemy.cooldown = enemy.cooldownTime;
						playSound("turretAim", enemy.pos);
						projectileTypes[projectileEnums.enemyLaser].create({ pos: enemy.pos.copy, dir: enemy.dir, link: enemy.id, maxLen: enemy.range });
					}
				}

				if (enemy.hp <= 0) {
					enemies.splice(i, 1);
					playSound("turretDeath", enemy.pos);
					i--;
					player.kills++;
					let newScreenshake = 50 / ((enemy.pos)["-"](player.pos).mag / 500 + 1);
					if (get("screenshake") < newScreenshake) {
						set("screenshake", newScreenshake);
					} else {
						set("screenshake", get("screenshake") + newScreenshake / 5);
					}
					player.xp += 20;
					player.score += 20;
					rumble(0.2, 0.7);
					explode(enemy.pos, 60);
				}
			}
		},
		beforeDraw: (enemy) => {
			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {

					} else {
						sketch.translate(enemy.pos.x, enemy.pos.y);
						sketch.rectMode("center");
						sketch.fill(0);
						sketch.stroke(255);
						sketch.strokeWeight(5);

						if (enemy.frozen) sketch.stroke(35, 178, 246)
						if (enemy.burning) sketch.stroke(230, 102, 72)

						sketch.line(-enemy.size, -enemy.size, enemy.size, enemy.size);
						sketch.line(-enemy.size, enemy.size, enemy.size, -enemy.size);
						sketch.rect(0, 0, enemy.size * 1.5, enemy.size * 1.5);
					}
				} else {
					sketch.fill(`rgba(150,50,0,${enemy.time * 0.5})`);
					sketch.stroke(`rgba(200,50,0,${enemy.time * 1})`);
					sketch.strokeWeight(5);
					sketch.circle(enemy.pos.x, enemy.pos.y, enemy.size * 2);
				}
			}
		},
		afterDraw: (enemy) => {
			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {
						sketch.push();
						sketch.textAlign("center", "center");
						sketch.textSize(enemy.size * 2);
						sketch.translate(enemy.pos.x, enemy.pos.y);
						sketch.rotate(enemy.vel.heading);
						sketch.text(">", 0, 0);
						sketch.pop();
					} else {
						sketch.translate(enemy.pos.x, enemy.pos.y);
						sketch.rotate(enemy.dir);
						sketch.rectMode("center");
						sketch.fill(0);
						sketch.stroke(190);
						sketch.strokeWeight(5);
						let dist = 0;
						let prog = 1 - enemy.reload / enemy.reloadTime;
						let time = 0.2;
						if (enemy.cooldown > 0) {
							dist = 0.35;
						} else {
							if (enemy.reloadTime - enemy.reload > time) {
								dist = 0.2 + (prog / (1 - time) - time) * 0.15;
							} else {
								dist = 0.35 - (enemy.reloadTime - enemy.reload) / time * 0.15;
							}
						}
						sketch.line(0, -enemy.size * dist, enemy.size * 1, -enemy.size * dist);
						sketch.line(0, enemy.size * dist, enemy.size * 1, enemy.size * dist);
						sketch.rect(-enemy.size * 0.3, 0, enemy.size * 0.8, enemy.size * 1.2);
					}
				} else {

				}
			}
		}
	}),
	new EnemyType({
		name: "Boss",
		props: ["mode", "pos", "vel", "spawn", "hp", "speed"],
		defaults: {
			type: 2,
			id: () => Math.floor(Math.random() * 1e6 + 2e6),
			pos: ({ mode }) => mode == 0 ? getPosAroundPlayer() : mode == 1 ? getRandomBox(currentLevel.size) : Vector.zero,
			vel: () => new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI),
			hp: 30,
			maxHp: ({ }, { hp }) => hp,
			hitDir: () => Math.random() * 2 * Math.PI,
			time: 0,
			children: [],
			effectTime: 0,
			burning: false,
			frozen: false,
			size: 50
		},
		spawn: (enemy) => {
			for (let i = 0; i < Math.round(enemy.hp / 10); i++) {
				enemy.children.push(enemyTypes[1].create({ mode: enemy.mode, pos: enemy.pos.copy, vel: new Vector(0, 0), hp: 15, index: i, max: Math.round(enemy.hp / 10) }));
			}
		},
		tick: (enemy, i) => {
			defaultTick(enemy, i, { burnAmt: 15, burnOffset: 0.5 });

			if (!enemy.frozen) {
				enemy.children.forEach((child, childIndex) => {
					child.pos = enemy.pos.copy;

					let multiplicationVector = new Vector(2, 0).rotate(((2 * Math.PI) / enemy.children.length) * childIndex + new Date().getTime() / 1000);
					multiplicationVector.mag = 100;
					child.pos = child.pos["+="](multiplicationVector);
				})

				if (enemy.time > 1 || !enemy.spawn) {
					if (enemy.hp <= 0) {
						enemies.splice(i, 1);
						i--;
						player.kills++;
						playSound("kill", enemy.pos);
						if (enemy.size > 10) {
							for (let rot = -1; rot <= 1; rot += 1) {
								enemyTypes[0].create({ pos: enemy.pos, vel: (enemy.vel)["+"](new Vector(50, 0).rotate(enemy.hitDir + rot)), size: enemy.size * 2 / 3, mode: 0 });
							}
						}
						let newScreenshake = (enemy.size > 20 ? 12 : 7) / ((enemy.pos)["-"](player.pos).mag / 500 + 1);
						if (get("screenshake") < newScreenshake) {
							set("screenshake", newScreenshake);
						} else {
							set("screenshake", get("screenshake") + newScreenshake / 5);
						}
						player.xp += enemy.size > 15 ? 5 : 3;
						player.score += enemy.size > 15 ? 5 : enemy.size > 10 ? 50 : 30;

						enemy.children.map(child => child.hp = 0)
						rumble(enemy.size > 15 ? 0.15 : enemy.size > 10 ? 0.1 : 0.05, enemy.size > 15 ? 0.5 : enemy.size > 10 ? 0.4 : 0.3);
						explode(enemy.pos, enemy.size > 15 ? 30 : enemy.size > 10 ? 20 : 10);
					}
				}
			}
		},
		beforeDraw: (enemy) => {
			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {

					} else {

					}
				} else {
					sketch.fill(`rgba(150,50,0,${enemy.time * 0.5})`);
					sketch.stroke(`rgba(200,50,0,${enemy.time * 1})`);
					sketch.strokeWeight(5);
					sketch.circle(enemy.pos.x, enemy.pos.y, enemy.size * 2);
				}
			}
		},
		afterDraw: (enemy) => {

			if (getOnScreen(enemy.pos, enemy.size)) {
				if (enemy.time > 1 || !enemy.spawn) {
					if (settings.emojiMovie) {
						sketch.push();
						sketch.textAlign("center", "center");
						sketch.textSize(enemy.size * 2);
						sketch.translate(enemy.pos.x, enemy.pos.y);
						sketch.rotate(enemy.vel.heading);
						sketch.text("⭐", 0, 0);
						sketch.pop();
					} else {
						sketch.fill("rgb(70, 10, 0)");
						sketch.stroke("rgb(250, 100, 100)");
						sketch.strokeWeight(5);

						if (enemy.frozen) {
							sketch.stroke(35, 178, 246)
							sketch.fill(15, 118, 186)
						}

						if (enemy.burning) {
							sketch.stroke(230, 102, 72)
							sketch.fill(200, 72, 32)
						}

						sketch.ellipse(enemy.pos.x, enemy.pos.y, enemy.size * 2, enemy.size * 2);
					}
				} else {

				}
			}
		}
	})
];

export default enemyTypes;

function getPosAroundPlayer() {
	let pos = (player.pos)["+"](new Vector(300 + currentLevel.size * 1.41 * Math.random() ** 0.7, 0).rotate(Math.random() * 2 * Math.PI));
	if (calcBorder({ pos }).mag > 0) {
		return getPosAroundPlayer();
	}
	return pos;
}

function defaultCollide(enemy) {
	let dif = (enemy.pos)["-"](player.pos);
	if (dif.mag < enemy.size + player.size && player.dodge.time <= 0 && !enemy.frozen) {
		let hitStr = (player.vel)["-"](enemy.vel).mag;
		enemy.hp--;
		enemy.pos["-="](player.pos);
		enemy.pos.mag = enemy.size + player.size + 3;
		enemy.pos["+="](player.pos);
		let hitVel = dif.copy;
		hitVel.mag = hitStr;
		enemy.vel["+="](hitVel);
		player.vel["-="](hitVel);
		enemy.hitDir = dif.heading;

		damagePlayer((enemy.size > 10 ? 25 : 15) * (hitStr / 250 + 0.5));
	}
}

function defaultTick(enemy, i, { burnTime = 15, burnOffset = 0.5, move = true }) {
	enemy.time += clampTime;

	if (enemy.burning) {
		enemy.hp -= (enemy.maxHp / burnTime + burnOffset) * clampTime;
	}

	enemy.effectTime -= clampTime;
	if (enemy.effectTime <= 0) {
		enemy.frozen = false;
		enemy.burning = false;
	}

	if (enemy.time > 1 || !enemy.spawn) {
		if (move) {
			if (!enemy.frozen) {
				enemy.pos["+="]((enemy.vel)["*"](clampTime));
			}
			applyBorder(enemy);
		}

		projectiles.forEach((projectile, projectileI) => {
			projectile.enemyTick(projectile, projectileI, enemy, i);
		});

		defaultCollide(enemy);
	}
}