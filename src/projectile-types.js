import Vector from "@cam0studios/vector-library";
import { lineCircleCollision, lineClosestPoint, raycast } from "@cam0studios/intersections";
import { projectiles, clampTime, calcBorder, sketch, settings, damagePlayer, currentLevel, player, enemies, time } from "./main";
import { playSound } from "./util/sound";
import { explode } from "./particle-types";

export const projectileEnums = {
	playerBullet: 0,
	enemyLaser: 1,
	guardian: 2
}

/**
 * Represents a type of projectile.
 * @class
 */
class ProjectileType {
	/**
	 * Creates an instance of ProjectileType.
	 * @param {string} name - The name of the projectile type.
	 * @param {Function} tick - The tick function for the projectile type.
	 * @param {Function} draw - The draw function for the projectile type.
	 * @param {Function} enemyTick - The enemy tick function for the projectile type.
	 * @param {Object} props - The properties of the projectile type.
	 * @param {Function} [spawn] - The spawn function for the projectile type.
	 */
	constructor({ name, tick, draw, enemyTick, props, defaults, spawn }) {
		this.name = name;
		this.tick = tick;
		this.draw = draw;
		this.enemyTick = enemyTick;
		this.props = props;
		this.defaults = defaults;
		if (spawn) this.spawn = spawn;
	}
	create(props) {
		let projectile = {};
		for (let prop in this.props) {
			if (prop in props) projectile[prop] = props[prop];
		}
		for (let prop in this.defaults) {
			let value;
			if (typeof this.defaults[prop] == "function") {
				value = this.defaults[prop](props, projectile);
			} else {
				value = this.defaults[prop];
			}
			if (value instanceof Vector) {
				value = value.copy;
			}
			projectile[prop] = value;
		}
		for (let prop of this.props) {
			if (prop in props) projectile[prop] = props[prop];
		}
		projectile.tick = this.tick;
		projectile.draw = this.draw;
		projectile.enemyTick = this.enemyTick;
		projectiles.push(projectile);
		if ("spawn" in this) this.spawn(projectile);
		return projectile;
	}
}

const projectileTypes = [
	new ProjectileType({
		name: "Player Bullet",
		props: ["pos", "dir", "speed", "damage", "fire", "ice", "piercing", "ignore"],
		defaults: {
			dir: ({ vel }) => vel ? vel.heading : 0,
			speed: ({ vel }) => vel ? vel.mag : 0
		},
		tick: (projectile, i) => {
			projectile.pos["+="](new Vector(projectile.speed * clampTime, 0).rotate(projectile.dir));

			if (calcBorder(projectile).mag > 100) {
				projectiles.splice(i, 1);
				i--;
			}
		},
		draw: (projectile) => {
			let lastPos = projectile.pos.copy;
			lastPos["+="](new Vector(20, 0).rotate(projectile.dir));

			sketch.stroke(255);
			sketch.strokeWeight(5);
			sketch.fill(0);

			if (projectile.ice) sketch.stroke(35, 178, 246);
			if (projectile.fire) sketch.stroke(230, 102, 72);

			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.text("⚪", projectile.pos.x, projectile.pos.y)
			} else {
				sketch.line(projectile.pos.x, projectile.pos.y, lastPos.x, lastPos.y);
			}
		},
		enemyTick(projectile, projectileI, enemy, enemyI) {
			if ((projectile.pos)["-"](enemy.pos).mag < enemy.size + 10) {
				if (projectile.ignore && projectile.ignore.includes(enemy.id)) return; // Don't hit the same enemy twice with piercing
				if (enemy.hp - projectile.damage > 0) {
					playSound("hit", enemy.pos)
				}

				enemy.hp -= projectile.damage;
				enemy.hitDir = projectile.dir;

				if (projectile.fire || projectile.ice) {
					if (!enemy.frozen) enemy.frozen = projectile.ice;
					if (!enemy.burning) enemy.burning = projectile.fire;

					enemy.effectTime = 3;
				}

				function remove() {
					projectiles.splice(projectileI, 1);
					projectileI--;
				}
				function pierce() {
					if (!projectile.ignore) {
						projectile.ignore = [enemy.id]
					} else {
						projectile.ignore.push(enemy.id);
					}
				}
				if (projectile.piercing > 0) {
					if (projectile.piercing >= 1) {
						pierce();
						projectile.piercing--;
					} else {
						if (Math.random() < projectile.piercing) {
							projectile.piercing = 0;
							pierce();
						} else {
							remove();
						}
					}
				} else {
					remove();
				}
			}
		}
	}),
	new ProjectileType({
		name: "Enemy Laser",
		props: ["pos", "dir", "link", "maxLen", "damage", "tractor", "push"],
		defaults: {
			cooldown: 0.5,
			firing: 0,
			dirV: ({ dir }) => new Vector(1, 0).rotate(dir),
			len: 0,
			maxLen: 1000,
			fired: false,
			size: 0,
			damage: 40,
			tractor: 1000,
			push: 1500
		},
		tick: (projectile, i) => {
			let linked = enemies.find(enemy => enemy.id === projectile.link);
			if (linked) {
				projectile.pos = linked.pos.copy;
				projectile.dir = linked.dir;
			}
			projectile.dirV = new Vector(1, 0).rotate(projectile.dir);
			if (projectile.cooldown > 0) {
				projectile.cooldown -= clampTime;
				if (projectile.cooldown <= 0) {
					projectile.firing = 0;
					projectile.cooldown = 0;
				}
			} else {
				if (projectile.fired == false) {
					playSound("turretFire", projectile.pos);
				}
				projectile.fired = true;
				projectile.firing += clampTime;
				projectile.len += clampTime * projectile.maxLen * 4;
				projectile.size = 10;
				if (projectile.firing < 0.1) {
					projectile.size *= projectile.firing * 10;
				}
				if (projectile.firing > 0.8) {
					projectile.size *= (1 - projectile.firing) * 5;
				}
				if (projectile.len > projectile.maxLen) projectile.len = projectile.maxLen;

				let dist = raycast(projectile.pos, projectile.dirV, player.pos, player.size + projectile.size);
				if (dist.length > 1) {
					let d1 = dist[0] + projectile.size;
					let d2 = dist[1] - projectile.size;
					if (d1 < projectile.len) {
						if (d2 > projectile.len) d2 = projectile.len;
						let pos = (projectile.pos)["+"]((projectile.dirV)["*"](d1));
						player.vel["+="]((projectile.dirV)["*"](clampTime * (projectile.tractor + projectile.push)));
						player.vel["+="]((pos)["-"](player.pos).normalize()["*"](clampTime * projectile.tractor));
						damagePlayer(projectile.damage * clampTime, pos);

						explode((pos)["+"](new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)), Math.random() * 10 + 5);
						let randPos = (projectile.pos)["+"]((projectile.dirV)["*"](d1 + Math.random() * (d2 - d1)));
						explode(randPos, Math.random() * 5 + 5);
					}
				}

				if (projectile.firing >= 1) {
					projectiles.splice(i, 1);
					i--;
				}
			}
		},
		draw: (projectile) => {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", projectile.pos.x, projectile.pos.y);
			} else {
				if (projectile.cooldown > 0) {
					sketch.noFill();
					sketch.stroke("rgba(255, 0, 0, 0.5)");
					sketch.strokeWeight(2);
					sketch.translate(projectile.pos.x, projectile.pos.y);
					sketch.line(0, 0, projectile.maxLen * projectile.dirV.x, projectile.maxLen * projectile.dirV.y);
				} else {
					sketch.noFill();
					sketch.stroke("rgb(200, 230, 255)");
					sketch.strokeWeight(projectile.size);
					sketch.translate(projectile.pos.x, projectile.pos.y);
					sketch.line(0, 0, projectile.len * projectile.dirV.x, projectile.len * projectile.dirV.y);
				}
			}
		},
		enemyTick: (projectile, i, enemy, enemyI) => {

		}
	}),
	new ProjectileType({
		name: "Guardian",
		props: ["speed", "damage", "dist", "amount", "duration", "size"],
		defaults: {
			dir: 0,
			time: 0,
			children: [],
			rad: 0,
			fade: 0
		},
		tick: (projectile, i) => {
			if (projectile.time == 0) {
				for (let rot = 0; rot < projectile.amount; rot++) {
					projectile.children.push({ pos: new Vector(0, 0), vel: new Vector(0, 0) });
				}
			}
			projectile.dir += projectile.speed * clampTime;
			projectile.time += clampTime;
			projectile.duration -= clampTime;
			projectile.fade = 1;
			if (projectile.time < 1.5) projectile.fade *= projectile.time / 1.5;
			if (projectile.duration < 1.5) projectile.fade *= projectile.duration / 1.5;
			projectile.fade = Math.pow(projectile.fade, 0.4);

			for (let rot = 0; rot < projectile.amount; rot++) {
				let child = projectile.children[rot];
				child.pos = new Vector(projectile.dist * projectile.fade, 0).rotate(projectile.dir + rot * Math.PI * 2 / projectile.amount);
				child.pos["+="](player.pos);
				child.vel = new Vector(0, projectile.speed * projectile.dist * projectile.fade * 2 * Math.PI * clampTime).rotate(projectile.dir + rot * Math.PI * 2 / projectile.amount);
			}

			projectile.rad = projectile.size * projectile.fade;

			if (projectile.duration <= 0) {
				projectiles.splice(i, 1);
				i--;
			}
		},
		draw: (projectile) => {
			sketch.translate(player.pos.x, player.pos.y);
			sketch.rotate(projectile.dir);
			for (let rot = 0; rot < projectile.amount; rot++) {
				sketch.push();
				sketch.rotate(rot * Math.PI * 2 / projectile.amount);
				sketch.translate(projectile.dist * projectile.fade, 0);
				sketch.rotate(-projectile.dir * 2);

				sketch.noStroke();
				sketch.fill(255);
				let spikes = 3;
				let spikeSize = new Vector(0.3, 0.45)["*"](projectile.fade * 0.5 + 0.5);
				spikeSize["*="](projectile.rad);
				for (let spike = 0; spike < spikes; spike++) {
					sketch.push();
					sketch.strokeJoin("miter");
					sketch.rotate(spike * Math.PI * 2 / spikes);
					sketch.beginShape();
					sketch.vertex(projectile.rad, spikeSize.x);
					sketch.vertex(projectile.rad + spikeSize.y, 0);
					sketch.vertex(projectile.rad, -spikeSize.x);
					sketch.endShape();
					sketch.pop();
				}

				sketch.stroke(255);
				sketch.strokeWeight(5);
				sketch.fill(0);
				sketch.circle(0, 0, projectile.rad * 2);

				sketch.strokeWeight(3);
				sketch.line(-projectile.rad * 0.2, 0, projectile.rad * 0.2, 0);
				sketch.line(0, -projectile.rad * 0.2, 0, projectile.rad * 0.2);

				sketch.pop();
			}
		},
		enemyTick: (projectile, i, enemy, enemyI) => {
			projectile.children.forEach(child => {
				let dif = (enemy.pos)["-"](child.pos);
				if (dif.mag < enemy.size + projectile.rad && !enemy.frozen) {
					let hitStr = (child.vel)["-"](enemy.vel).mag;
					enemy.hp--;
					enemy.pos["-="](child.pos);
					enemy.pos.mag = enemy.size + projectile.rad;
					enemy.pos["+="](child.pos);
					let hitVel = dif.copy;
					hitVel.mag = hitStr;
					enemy.vel["+="](hitVel);
					enemy.hitDir = dif.heading;
				}
			});
		}
	})
];

export default projectileTypes;