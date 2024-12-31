import Vector from "../vector-library/vector";
import { intersections } from "../vector-library/intersection";
import { projectiles, clampTime, calcBorder, sketch, settings, damagePlayer, currentLevel, player, enemies, time } from "./main";
import { playSound } from "./sound";

export const projectileEnums = {
	playerBullet: 0,
	explosion: 1,
	enemyLaser: 2,
	dashEffect: 3,
	// sacredBlade: 4
}

const projectileTypes = [
	class {  // player bullet
		constructor(data) {
			if (data.vel) {
				data.dir = data.vel.heading;
				data.speed = data.vel.mag;
			}
			Object.assign(this, data);
			projectiles.push(this);
		}

		tick(i) {
			this.pos["+="](new Vector(this.speed * clampTime, 0).rotate(this.dir));

			if (calcBorder(this).mag > 100) {
				projectiles.splice(i, 1);
				i--;
			}
		}

		draw() {
			let lastPos = this.pos.copy;
			lastPos["+="](new Vector(20, 0).rotate(this.dir));

			sketch.stroke(255);
			sketch.strokeWeight(5);
			sketch.fill(0);
			
			if (this.ice) sketch.stroke(35, 178, 246);
			if (this.fire) sketch.stroke(230, 102, 72);

			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.text("⚪", this.pos.x, this.pos.y)
			} else {
				sketch.line(this.pos.x, this.pos.y, lastPos.x, lastPos.y);
			}
		}

		enemyTick(i, enemy, enemyI) {
			if ((this.pos)["-"](enemy.pos).mag < enemy.size + 10) {
				if (this.ignore && this.ignore.includes(enemy.id)) return; // Don't hit the same enemy twice with piercing
				if (enemy.hp - this.damage > 0) {
					playSound("hit")
				}

				enemy.hp -= this.damage;
				enemy.hitDir = this.dir;

				if (this.fire || this.ice) {
					if (!enemy.frozen) enemy.frozen = this.ice;
					if (!enemy.burning) enemy.burning = this.fire;

					enemy.effectTime = 3;
				}

				function remove() {
					projectiles.splice(i, 1);
					i--;
				}
				function pierce(that) {
					if (!that.ignore) {
						that.ignore = [enemy.id]
					} else {
						that.ignore.push(enemy.id);
					}
				}
				if (this.piercing > 0) {
					if (this.piercing >= 1) {
						pierce(this);
						this.piercing--;
					} else {
						if (Math.random() < this.piercing) {
							this.piercing = 0;
							pierce(this);
						} else {
							remove();
						}
					}
				} else {
					remove();
				}
			}
		}
	},
	class {  // explosion
		constructor(data) {
			this.pos = data.pos;
			this.size = data.size;
			this.maxSize = data.maxSize;
			projectiles.push(this);
		}

		tick(i) {
			if (this.size > this.maxSize) {
				projectiles.splice(i, 1);
				i--;
			} else {
				this.size += clampTime * 30 * Math.sqrt(this.maxSize);
			}
		}

		draw() {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", this.pos.x, this.pos.y);
			} else {
				sketch.fill(250);
				sketch.stroke(200);
				sketch.strokeWeight(this.maxSize * 0.5);
				sketch.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
			}
		}

		enemyTick(i, enemy, enemyI) {

		}
	},
	class {  // enemy laser
		constructor(data) {
			this.pos = data.pos;
			this.dir = data.dir;
			this.cooldown = 0.5;
			this.firing = 0;
			this.dirV = new Vector(1, 0).rotate(this.dir);
			this.link = data.link || -1;
			this.len = 0;
			this.maxLen = currentLevel.size * 2;
			projectiles.push(this);
		}

		tick(i) {
			let linked = enemies.find(enemy => enemy.id === this.link);
			if (linked) {
				this.pos = linked.pos.copy;
				// this.dir = linked.dir;
			}
			this.dirV = new Vector(1, 0).rotate(this.dir);
			if (this.cooldown > 0) {
				this.cooldown -= clampTime;
				if (this.cooldown <= 0) {
					this.firing = 0;
					this.cooldown = 0;
				}
			} else {
				this.firing += clampTime;
				this.len += clampTime * this.maxLen * 1.5;
				if (this.len > this.maxLen) this.len = this.maxLen;

				let int = intersections.lineCircleCollision(this.pos, (this.pos)["+"]((this.dirV)["*"](this.len)), player.pos, 25);
				if (int) {
					let point = intersections.lineClosestPoint(this.pos, (this.pos)["+"]((this.dirV)["*"](this.len)), player.pos);
					explode(point["+"](new Vector(Math.random() * 15, 0).rotate(Math.random() * 2 * Math.PI))["-"]((this.dirV)["*"](20)), 15);
					damagePlayer(clampTime * 10);
					player.vel["+="]((point)["-"](player.pos).normalized["*"](clampTime * 500));
					player.vel["+="]((this.dirV)["*"](clampTime * 1000));
				}

				if (this.firing >= 1) {
					projectiles.splice(i, 1);
					i--;
				}
			}
		}

		draw() {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", this.pos.x, this.pos.y);
			} else {
				if (this.cooldown > 0) {
					sketch.noFill();
					sketch.stroke("rgba(255, 0, 0, 0.5)");
					sketch.strokeWeight(2);
					sketch.translate(this.pos.x, this.pos.y);
					sketch.line(0, 0, this.maxLen * this.dirV.x, this.maxLen * this.dirV.y);
				} else {
					sketch.noFill();
					sketch.stroke("rgb(200, 230, 255)");
					let thick = 10;
					if (this.firing < 0.1) {
						thick *= this.firing * 10;
					}
					if (this.firing > 0.8) {
						thick *= (1 - this.firing) * 5;
					}
					sketch.strokeWeight(thick);
					sketch.translate(this.pos.x, this.pos.y);
					sketch.line(0, 0, this.len * this.dirV.x, this.len * this.dirV.y);
				}
			}
		}

		enemyTick(i, enemy, enemyI) {

		}
	},
	class {  // dash effect
		constructor(data) {
			this.pos = data.pos;
			this.type = data.type;
			this.progress = 0;
			projectiles.push(this);
		}

		tick(i) {
			if (this.type == 0) {
				this.progress += clampTime * 5;
			} else {
				this.progress += clampTime * 1;
				if (player.dodgeTime > 0) {
					this.progress = 1;
				}
			}
			if (this.progress >= 1) {
				projectiles.splice(i, 1);
				i--;
			}
		}

		draw() {
			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.textSize(10);
				sketch.noStroke();
				sketch.fill(255);
				sketch.text("", this.pos.x, this.pos.y);
			} else {
				let alpha;
				let col = 150;
				if (this.type == 0) {
					alpha = (1 - this.progress) * 0.2;
					if (alpha < 0) alpha = 0;
					if (alpha > 1) alpha = 1;
				} else {
					alpha = (1 - this.progress) * 0.01;
					if (alpha < 0) alpha = 0;
					if (alpha > 1) alpha = 1;
					col = 100;
				}
				alpha = Math.round(alpha * 100) / 100;
				sketch.fill(`rgba(${col}, ${col}, ${col}, ${alpha})`);
				sketch.noStroke();
				sketch.circle(this.pos.x, this.pos.y, 30 + this.progress * 40);
			}
		}

		enemyTick(i, enemy, enemyI) {

		}
	},
	// class {  // sacred blade
	//   constructor(data) {
	//     this.pos = data.pos;
	//     this.vel = new Vector(data.vel.x, data.vel.y);
	//     this.dir = Vector.zero;
	//     this.damage = data.damage;
	//     this.speed = data.speed;
	//     this.life = 0;
	//     this.lifeTime = data.lifeTime;
	//     projectiles.push(this);
	//   }

	//   tick(i) {
	//     this.pos["+="](this.vel["*"](clampTime));

	//     if (calcBorder(this).mag > 100 || (player.pos["-"](this.pos).mag < 100 && this.life > 1)) {
	//       projectiles.splice(i, 1);
	//       i--;
	//     }

	//     this.vel["+="](player.pos["-"](this.pos).normalized["*"](clampTime * 2000));
	//     this.dir["+="](clampTime * 5);

	//     this.life += clampTime;
	//   }

	//   draw() {
	//     const scale = 50;

	//     sketch.push()

	//     sketch.translate(this.pos.x, this.pos.y);
	//     // sketch.rotate(this.vel.heading);
	//     sketch.rotate(time * 40);
	//     sketch.fill(255);


	//     sketch.rect(0, 0, scale * 2, scale * 0.5, 2);
	//     sketch.triangle(scale, scale, scale * 2, scale, scale, 0);
			
	//     sketch.pop();

	//   }

	//   enemyTick(i, enemy, enemyI) {
	//     if ((this.pos)["-"](enemy.pos).mag < enemy.size + 100) {
	//       enemy.hp -= this.damage;
	//       enemy.hitDir = this.dir;
	//       // projectiles.splice(i, 1);
	//       i--;
	//     }
	//   }

	// }
];

export default projectileTypes;

export function explode(pos, size) {
	new projectileTypes[projectileEnums.explosion]({
		pos,
		size: 0,
		maxSize: size
	});
}