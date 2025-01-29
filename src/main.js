import p5 from "p5";
import Vector from "@cam0studios/vector-library";
import weapons from "./weapon-types";
import enemyTypes from "./enemy-types";
import levels from "./levels";
import projectileTypes, { projectileEnums } from "./projectile-types";
import { signOut, pb, getScores, postScore, user, getUsers, postFeed, signedIn, signIn, signInWithGoogle, updateStats, subscribeToFeed } from "./pocketbase";
import { gamepad, gamepadConnected, rumble, updateGamepad } from "./gamepad";
import { audioContext, playSound } from "./sound";
import EasyStorage from "@pikapower9080/easy-storage";
import particleTypes, { explode, particleEnums } from "./particle-types";
import xssFilters from "xss-filters";

import './style/main.less';
import { showRunInfo } from "./util/run-info";
import { levelUp } from "./util/level-up";
import { getSettingsMenu } from "./util/settings";

export const version = "v0.4.15";

export var keys = {};
"qwertyuiopasdfghjklzxcvbnm ".split("").forEach(key => {
	keys[key] = false;
});
// disable right click
document.addEventListener("contextmenu", e => e.preventDefault());

export const settingsStore = new EasyStorage({
	key: "asteroids-settings",
	default: {
		toggleFire: false,
		doScreenShake: true,
		isMuted: false,
		dimBG: false,
		starDetail: "1",
		sendFeedEvents: true,
		showFeed: true,
		submitScores: true,
		reticle: "0",
		rumbleEnabled: true
	},
	migration: {
		enabled: true,
		old_key: "settings"
	}
})

// global vars
/**
 * @type {p5}
 */
export var sketch

export var clampTime,
	enemies,
	player,
	projectiles,
	size = new Vector(innerWidth, innerHeight),
	cam,
	currentLevel,
	settings,
	mouseDown,
	time,
	fpsTime,
	fps,
	fpsHistory = [],
	averageFps,
	nextFps,
	deltaTime,
	mouse = Vector.zero,
	screenshake,
	cursorContract,
	paused,
	score,
	posted,
	started = false,
	starCol = 100,
	showHud = true,
	editableSettings = {},
	cheated,
	particles,
	iconFont = "Font Awesome 6 Pro",
	textFont = "Space Mono",
	lastScore,
	maxFps = 240,
	isFirstLevelup = true;

export const devMode = __IS_DEVELOPMENT__; // This will be replaced by esbuild accordingly
window.ASTEROIDS_IS_DEVELOPMENT = devMode;

// setup base html
document.getElementById("startScreen").showModal();
started = false;
document.getElementById("start").addEventListener("click", () => {
	startGame(0);
	document.getElementById("startScreen").close();
	audioContext.resume();
});

function startGame(level) {
	currentLevel = levels[level];
	let p5Inst = new p5(sketchFunc);
	started = true;
	subscribeToFeed();
}
function stopGame() {
	sketch.noLoop();
	document.getElementById("defaultCanvas0").remove();
	started = false;
}

export function getRarity(weight) {
	if (weight < 0.25) {
		return "epic"
	} else if (weight < 0.5) {
		return "rare"
	} else {
		return "common"
	}
}

const closingDialogues = [];
export function closeWithAnimation(dialog, animation, duration) {
	if (closingDialogues.includes(dialog)) return;
	dialog.classList.add(animation)
	closingDialogues.push(dialog)
	setTimeout(() => {
		dialog.close()
		dialog.classList.remove(animation)
		closingDialogues.splice(closingDialogues.indexOf(dialog), 1)
	}, duration);
}

var stars = [];

export var playerUpgrades = [
	{ name: "Speed", desc: "Increase movement speed", func: () => player.speed += 120, max: 3, weight: 1 },
	{ name: "Health", desc: "Increase max health", func: () => { player.maxHp *= 1.35; player.hp += 20 }, max: 3, weight: 1 },
	{ name: "Shield", desc: "Improve shield regeneration and capacity", func: () => { player.shield.maxValue += 10; player.shield.regenTime--; player.shield.regenSpeed++ }, max: 5, weight: 0.8 },
	{ name: "Resistance", desc: ["Take 10% less damage (-10% total)", "Take 10% less damage (-20% total)", "Take 10% less damage (-30% total)", "Take 10% less damage (-40% total)"], func: () => player.damageFactor -= 0.1, max: 4, weight: 0.8 },
	{ name: "Recovery", desc: ["Recover 0.25 HP every second", "Recover 0.5 HP every second", "Recover 0.75 HP every second", "Recovery 1 HP every second"], func: () => { player.recovery += 0.25 }, max: 4, weight: 0.4 }
	// { name: "", desc: [], func: () => {}, max: 0, weight: 1 }
];

// ********************  p5  ******************** //
const sketchFunc = (sk) => {
	sketch = sk;
	enemies = [];
	posted = false;
	player = {
		pos: Vector.zero,
		vel: Vector.zero,
		dir: 0,
		weapons: [],
		isFiring: false,
		speed: 350,
		xp: 200,
		levelUp: 200,
		hp: 100,
		maxHp: 100,
		level: -1,
		kills: 0,
		score: 0,
		died: false,
		shield: {
			value: 0,
			maxValue: 30,
			regenTime: 10,
			regenSpeed: 5,
			regenTimeLeft: 0
		},
		dodge: {
			cooldown: 0,
			vel: Vector.zero,
			time: 0
		},
		damageFactor: 1,
		recovery: 0
	};
	paused = false;
	score = 0;
	playerUpgrades.forEach(upgrade => upgrade.times = 0);

	if (devMode) {
		window.playerLink = player;
		window.setTime = (val) => time = val;
	}

	getSettings();
	editableSettings = [
		{ name: "Toggle Shoot", var: "toggleFire", type: "checkbox" },
		{ name: "Screen Shake", var: "doScreenShake", type: "checkbox" },
		{ name: "Dim Background", var: "dimBG", type: "checkbox" },
		{ name: "Submit Scores", var: "submitScores", type: "checkbox" },
		{ name: "Send Feed Events", var: "sendFeedEvents", type: "checkbox" },
		{ name: "Show Feed", var: "showFeed", type: "checkbox" },
		{ name: "Mute", var: "isMuted", type: "checkbox" },
		{ name: "Rumble", var: "rumbleEnabled", type: "checkbox" },
		{ name: "Star Detail", var: "starDetail", type: "select", options: [0, 1, 2, 3], labels: ["High", "Medium", "Low", "Grid"] },
		{ name: "Reticle", var: "reticle", type: "select", options: [0, 1, 2, 3], labels: ["Fancy", "Crosshair", "Static", "None"] }
	];
	currentLevel.start.forEach(start => {
		for (let i = 0; i < start.count; i++) {
			let props = { mode: 0, index: i, max: start.count };
			for (let prop in start.props) {
				props[prop] = start.props[prop];
			}
			enemyTypes[start.type].create(props);
		}
	});

	addWeapon("gun");
	projectiles = [];
	particles = [];
	size = new Vector(innerWidth, innerHeight);
	cam = Vector.zero;
	time = 0;
	fpsTime = 0;
	fps = 0;
	nextFps = [];
	screenshake = 0;
	mouseDown = false;
	cursorContract = 0;
	updateStars();
	if (!devMode) {
		sketch.disableFriendlyErrors = true
	}
	sketch.setup = () => {
		sketch.createCanvas(size.x, size.y);
		sketch.frameRate(maxFps);
		document.getElementById("defaultCanvas0").focus();
	}

	sketch.draw = () => {
		// ********************  vars  ******************** //
		deltaTime = sketch.deltaTime / 1000;
		clampTime = sketch.deltaTime;
		if (clampTime > 100) clampTime = 100;
		clampTime /= 1000;

		if (!player.died) time += clampTime;

		// cam["="](player.pos);
		let camMove = Math.pow(1e-3, clampTime);
		cam["*="](camMove);
		cam["+="]((player.pos)["*"](1 - camMove));


		if (settings.mousePan) cam["+="](mouse["/"](100));

		if (settings.doScreenShake) cam["+="](new Vector(screenshake, 0).rotate(Math.random() * 2 * Math.PI));
		screenshake *= Math.pow(5e-5, clampTime);

		// fps
		if (fpsTime < 0) {
			fps = 0;
			nextFps.forEach(next => {
				fps += next / nextFps.length;
			});
			nextFps = [];
			fpsTime = 0.2;
		} else {
			fpsTime -= deltaTime;
			nextFps.push(1 / deltaTime);
		}

		// blood overlay
		document.querySelector(".vignette-red").style.opacity = 1 - Math.min((player.hp / player.maxHp) * 1.5, 1);

		// waves
		currentLevel.waves.forEach(wave => {
			if (!("passed" in wave)) wave.passed = false;
			if (!wave.passed) {
				if (time > wave.time) {
					wave.passed = true;
					wave.enemies.forEach(enemy => {
						for (let i = 0; i < enemy.count; i++) {
							let props = { mode: 1, index: i, max: enemy.count };
							for (let prop in enemy.props) {
								props[prop] = enemy.props[prop];
							}
							enemyTypes[enemy.type].create(props);
						}
					});
				}
			}
		});

		// health recovery
		if (player.hp < player.maxHp && player.hp > 0 && player.recovery > 0) {
			// Add player.recovery every second
			if (time % 1 < deltaTime) {
				player.hp += player.recovery;
			}
		}

		// ********************  physics  ******************** //
		// player movement
		if (player.hp > 0) {
			player.pos["+="]((player.vel)["*"](clampTime));

			let joy = new Vector(keys["d"] - keys["a"], keys["s"] - keys["w"]);
			joy["+="](gamepad.leftStick);
			if (joy.mag > 1) joy.mag = 1;
			joy["*="](player.speed * clampTime);
			player.vel["+="](joy);
			player.vel["*="](Math.pow(0.3, clampTime));
			if (joy.mag > 0) {
				// projectileTypes[particleEnums.dashEffect].create({ pos: player.pos.copy, type: 1 });
			}

			player.isFiring = (mouseDown || gamepad.rightTrigger) != settings.toggleFire

			if (gamepadConnected) {
				if (gamepad.rightStick.mag > 0.1) {
					let dir = gamepad.rightStick.copy;
					dir.mag = 200;
					mouse["="](dir);
				}
			}

			if (player.dodge.time <= 0) {
				player.dodge.cooldown -= clampTime;
				if ((keys[" "] || gamepad.leftTrigger) && player.dodge.cooldown <= 0 && joy.mag > 0) {
					// Player dodge / dash
					player.dodge.cooldown = 0.2;
					player.dodge.vel = joy.copy;
					player.dodge.vel.mag = 1000;
					player.dodge.time = .15;
					playSound("dash");
				}
			} else {
				player.dodge.time -= clampTime;
				if (player.dodge.time <= 0) {
					player.dodge.vel = Vector.zero;
				}
				player.vel["="](player.dodge.vel);
				particleTypes[particleEnums.dashEffect].create({ pos: player.pos.copy });
			}

			player.dir = mouse.heading;
			applyBorder(player);

			// level up
			if (player.xp >= player.levelUp) {
				levelUp();
			}

			// player shield
			if (player.shield.value < player.shield.maxValue) {
				if (player.shield.regenTimeLeft < player.shield.regenTime) {
					player.shield.regenTimeLeft += clampTime;
				} else {
					player.shield.value += player.shield.regenSpeed * clampTime;
				}
			} else if (player.shield.value > player.shield.maxValue) {
				player.shield.value = player.shield.maxValue;
			}

			if (player.hp > player.maxHp) player.hp = player.maxHp;

			// weapons
			player.weapons.forEach(weapon => {
				weapon.tick(weapon);
			});
		} else {
			player.hp = 0;
			if (!player.died) {
				player.died = true;
				die();
				document.getElementById("gameOver").showModal();
			}
		}

		// projectiles
		projectiles.forEach((projectile, projectileI) => {
			projectile.tick(projectile, projectileI);
		});

		// enemies
		enemies.forEach((enemy, enemyI) => {
			enemy.tick(enemy, enemyI);
		});

		// particles
		particles.forEach((particle, particleI) => {
			particle.tick(particle, particleI);
		});


		// ********************  drawing  ******************** //
		// background
		if (settings.noBG) sketch.background(`rgba(0,0,0,${Math.round((1 - Math.pow(0.03, clampTime)) * 10000) / 10000})`);
		else sketch.background("rgb(0,0,0)");

		sketch.stroke("rgb(35,35,35)");
		sketch.strokeWeight(2);
		sketch.strokeJoin("round");

		// lines
		if (settings.starDetail == 3) {
			let lineSize = 70;
			let off = ((cam)["*"](-1))["%"](lineSize);
			for (let x = 0; x < size.x + lineSize; x += lineSize) {
				let lineX = x + off.x;
				sketch.line(lineX, 0, lineX, size.y);
			}

			for (let y = 0; y < size.y + lineSize; y += lineSize) {
				let lineY = y + off.y;
				sketch.line(0, lineY, size.x, lineY);
			}
		}

		sketch.push();
		sketch.translate(size.x / 2, size.y / 2);

		sketch.translate(-cam.x, -cam.y);

		// cosmos
		// if ("planets" in currentLevel) {
		//   currentLevel.planets
		// }
		stars.forEach(star => {
			if (!settings.noBG || star.size < 10) {
				let pos = star.pos.copy;
				pos["-="]((cam)["*"](-star.layer));
				if (getOnScreen(pos, star.size)) {
					sketch.stroke(star.col);
					sketch.strokeWeight(star.size);
					sketch.point(pos.x, pos.y);
				}
			}
		});
		if (!settings.noBG && settings.dimBG) sketch.background("rgba(0,0,0,0.5)");

		// world borders
		if (true) {
			sketch.push();
			sketch.noStroke();
			let num = 2;
			let borderSize = 20;
			let borderPow = 0.7;
			let col = "0,0,0";
			let outerSize = new Vector(size.x / 2 + currentLevel.size * 0.5, size.y / 2 + currentLevel.size * 0.5);
			// right
			if (cam.x > currentLevel.size - size.x / 2) {
				for (let i = 0; i < num; i++) {
					sketch.fill(`rgba(${col},${Math.round(Math.pow((i + 1) / (num + 1), borderPow) * 100) / 100})`);
					sketch.rect(currentLevel.size + i * borderSize, cam.y - size.y / 2, borderSize, size.y);
				}

				sketch.fill(`rgb(${col})`);
				sketch.rect(currentLevel.size + num * borderSize, cam.y - size.y / 2, outerSize.x / 2, size.y);
			}
			// left
			if (cam.x < -currentLevel.size + size.x / 2) {
				for (let i = 0; i < num; i++) {
					sketch.fill(`rgba(${col},${Math.round(Math.pow((i + 1) / (num + 1), borderPow) * 100) / 100})`);
					sketch.rect(-currentLevel.size - i * borderSize, cam.y - size.y / 2, -borderSize, size.y);
				}

				sketch.fill(`rgb(${col})`);
				sketch.rect(-currentLevel.size - num * borderSize, cam.y - size.y / 2, -size.x / 2, size.y);
			}
			// bottom
			if (cam.y > currentLevel.size - size.y / 2) {
				for (let i = 0; i < num; i++) {
					sketch.fill(`rgba(${col},${Math.round(Math.pow((i + 1) / (num + 1), borderPow) * 100) / 100})`);
					sketch.rect(cam.x - size.x / 2, currentLevel.size + i * borderSize, size.x, borderSize);
				}

				sketch.fill(`rgb(${col})`);
				sketch.rect(cam.x - size.x / 2, currentLevel.size + num * borderSize, size.x, size.y / 2);
			}
			// top
			if (cam.y < -currentLevel.size + size.y / 2) {
				for (let i = 0; i < num; i++) {
					sketch.fill(`rgba(${col},${Math.round(Math.pow((i + 1) / (num + 1), borderPow) * 100) / 100})`);
					sketch.rect(cam.x - size.x / 2, -currentLevel.size - i * borderSize, size.x, -borderSize);
				}

				sketch.fill(`rgb(${col})`);
				sketch.rect(cam.x - size.x / 2, -currentLevel.size - num * borderSize, size.x, -size.y / 2);
			}
			sketch.pop();
		}

		// enemies before draw
		enemies.forEach(enemy => {
			sketch.push();
			enemy.beforeDraw(enemy);
			sketch.pop();
		});

		// particles
		particles.forEach(particle => {
			sketch.push();
			particle.draw(particle);
			sketch.pop();
		});

		// projectiles
		projectiles.forEach(projectile => {
			sketch.push();
			projectile.draw(projectile);
			sketch.pop();
		});

		// enemies after draw
		enemies.forEach(enemy => {
			sketch.push();
			enemy.afterDraw(enemy);
			sketch.pop();
		});

		// player
		if (player.hp > 0) {
			sketch.push();
			sketch.translate(player.pos.x, player.pos.y);

			sketch.rotate(player.dir);

			if (settings.emojiMovie) {
				sketch.textAlign("center", "center");
				sketch.rotate(Math.PI / 4);
				sketch.textSize(50);
				sketch.text("🚀", 0, 0);
			} else {
				let shieldOpacity = (player.shield.value / 10) * 0.6 + 0.4;
				if (shieldOpacity > 1) shieldOpacity = 1;
				if (shieldOpacity < 0) shieldOpacity = 0;
				if (player.shield.value > 0) {
					sketch.stroke(`rgba(50,120,200,${0.8 * shieldOpacity})`);
					sketch.noFill();
					sketch.strokeWeight(5);
					sketch.circle(0, 0, 50);
				}
				sketch.stroke(255);
				sketch.strokeWeight(5);
				sketch.fill(0);
				sketch.triangle(-15, -15, 20, 0, -15, 15);
				if (player.shield.value > 0) {
					sketch.noStroke();
					sketch.fill(`rgba(50,120,200,${0.2 * shieldOpacity})`);
					sketch.strokeWeight(5);
					sketch.circle(0, 0, 50);
				}
			}
			sketch.pop();
		}

		sketch.pop();

		if (showHud) {
			// hud
			sketch.push();
			sketch.fill("rgba(0,0,0,0.5)");
			sketch.noStroke();
			sketch.rectMode("corners");
			sketch.rect(12.5, 12.5, 137.5, 85, 12.5);
			sketch.rect(size.x - 12.5, 12.5, size.x - 100, 140, 12.5);
			sketch.pop();

			// minimap
			let minimapSize = 130;
			let minimapBorder = 10
			sketch.push();
			sketch.fill(0);
			sketch.stroke(255);
			sketch.strokeWeight(5);
			sketch.rect(size.x - minimapSize - 20 - minimapBorder / 2, size.y - minimapSize - 20 - minimapBorder / 2, minimapSize + minimapBorder, minimapSize + minimapBorder);
			sketch.translate(size.x - 20 - minimapSize / 2, size.y - 20 - minimapSize / 2);
			sketch.scale(130 / 2, 130 / 2);

			// minimap content
			enemies.forEach(enemy => {
				sketch.strokeWeight(0.002 * enemy.size * [1, 2.5, 2.5][enemy.type]);
				sketch.stroke(["rgb(200,50,0)", "rgb(50,200,0)", "rgb(0,50,200)"][enemy.type]);
				sketch.point(enemy.pos.x / currentLevel.size, enemy.pos.y / currentLevel.size);
			});
			sketch.strokeWeight(0.05);
			sketch.stroke(255);
			sketch.point(player.pos.x / currentLevel.size, player.pos.y / currentLevel.size);
			sketch.pop();

			// enemies left text
			sketch.push();
			sketch.textFont(textFont);
			sketch.noStroke();
			sketch.textSize(20);
			sketch.fill(255);
			sketch.textAlign("right", "bottom");
			let xPos = size.x - 50;
			sketch.text(Math.round(fps), xPos, 40);
			sketch.text(player.kills, xPos, 70);
			sketch.text(enemies.length, xPos, 100);
			sketch.text(player.score, xPos, 130);
			sketch.textAlign("left", "bottom");
			sketch.textFont(iconFont)
			sketch.text("\u{f54c}", xPos + 5, 70); // Skull icon
			sketch.text("\u{f71d}", xPos + 5, 100); // Swords icon
			sketch.text("\u{f005}", xPos + 5, 130); // Star icon
			sketch.textFont(textFont);
			sketch.textSize(15);
			sketch.text("fps", xPos + 5, 40);
			sketch.pop();

			// time
			sketch.textAlign("center", "top");
			sketch.textFont(textFont);
			sketch.fill(255);
			sketch.noStroke();
			sketch.textSize(35);
			sketch.text(formatTime(time), size.x / 2, 10);

			// Reticle (cursor)
			if (settingsStore.get("reticle", "0") != "3") {
				sketch.push();
				sketch.stroke(255);
				sketch.strokeWeight(5);
				sketch.translate(size.x / 2 + mouse.x, size.y / 2 + mouse.y);
				sketch.scale(0.7);

				if (settingsStore.get("reticle", "0") == "1" || settingsStore.get("reticle", "0") == "0") {
					// Dynamic crosshair
					let dist1 = 14 - cursorContract * 3;
					let dist2 = 8 - cursorContract * 2;
					sketch.line(dist1, 0, dist2, 0);
					sketch.line(0, dist1, 0, dist2);
					sketch.line(-dist1, 0, -dist2, 0);
					sketch.line(0, -dist1, 0, -dist2);
				} else if (settingsStore.get("reticle", "0") == "2") {
					// Static crosshair
					let dist1 = 8;
					let dist2 = 3;
					sketch.line(dist1, 0, dist2, 0);
					sketch.line(0, dist1, 0, dist2);
					sketch.line(-dist1, 0, -dist2, 0);
					sketch.line(0, -dist1, 0, -dist2);
				}

				if (settingsStore.get("reticle", "0") == "0") {
					// Reticle decoration
					dist1 = 20;
					dist2 = 10;
					sketch.line(-dist1, -dist2, -dist2, -dist1);
					sketch.line(dist2, -dist1, dist1, -dist2);
					sketch.line(dist1, dist2, dist2, dist1);
					sketch.line(-dist2, dist1, -dist1, dist2);
				}
				sketch.pop();
			}

			// health, xp, shield
			bar(new Vector(25, 35), 100, player.hp / player.maxHp, "rgb(50,0,0)", "rgb(250,50,0)", 15);
			bar(new Vector(25, 55), 100, player.xp / player.levelUp, "rgb(40,30,0)", "rgb(220,200,0)", 15);
			bar(new Vector(25, 25), 100, player.shield.value / player.shield.maxValue, "rgb(0,40,60)", "rgb(0,150,250)", 5);
		}

		if (cheated) {
			sketch.textAlign("left", "bottom");
			sketch.textFont(textFont);
			sketch.fill(255, 102, 51);
			sketch.textSize(15);
			sketch.text("Cheated Run - Invalid", 10, size.y - 10);
		}

		// fps history
		if (time % 1 < deltaTime && fps <= maxFps && fps > 0) {
			fpsHistory.push(parseFloat(fps.toFixed(3)));
		}

		// update exposed values
		if (devMode) {
			window.game = { clampTime, enemies, player, projectiles, particles, sketch, size, cam, currentLevel, settings, mouseDown, time, fpsTime, fps, nextFps, deltaTime, mouse, screenshake, cursorContract, devMode, paused, score, posted, started, starCol, editableSettings, isFirstLevelup, version, showHud, settingsStore, fpsHistory, getRunInfo, levelUp, showRunInfo };
		} else {
			window.game = { size, fps, deltaTime, paused, version, getRunInfo }
		}
	}
}

// ********************  functions  ******************** //
export function addWeapon(id) {
	let weapon = weapons.find(weapon => weapon.id == id);
	weapon.givePlayer();
}
export function calcBorder(obj) {
	let vec = Vector.zero;
	if (obj.pos.x > currentLevel.size) {
		let dist = obj.pos.x - currentLevel.size;
		vec["+="](dist, 0);
	}
	if (obj.pos.x < -currentLevel.size) {
		let dist = obj.pos.x + currentLevel.size;
		vec["+="](dist, 0);
	}
	if (obj.pos.y > currentLevel.size) {
		let dist = obj.pos.y - currentLevel.size;
		vec["+="](0, dist);
	}
	if (obj.pos.y < -currentLevel.size) {
		let dist = obj.pos.y + currentLevel.size;
		vec["+="](0, dist);
	}
	return (vec)["*"](-1);
}

async function die(silent) {
	paused = true;
	rumble(1, 1);
	explode(player.pos, 100);
	if (!silent) playSound("death")
	let scoreRecordId;

	lastScore = {
		score: player.score, time: Math.round(time), devMode, version, runData: getRunInfo()
	}

	document.getElementById("score").innerText = player.score;
	document.getElementById("scores").innerHTML = "<p> <b> Loading... </b> </p>";
	document.getElementById("stats").innerHTML = "<p> <b> Loading... </b> </p>";
	if (signedIn) {
		document.getElementById("signInDiv").innerHTML = `<p> <b> Signed in as ${xssFilters.inHTMLData(user.name)} </b> </p> <button id="signOutBtn"> Sign out </button>`;
		document.getElementById("signOutBtn").addEventListener("mouseenter", () => playSound("hover"));
		setTimeout(() => {
			document.getElementById("signOutBtn").addEventListener("click", () => {
				signOut();
				die(true);
			});
		}, 100);
		if (!posted) {
			let promises = [];
			document.getElementById("score-not-submitted").classList.toggle("no-display", true)

			promises.push(postFeed({
				type: "death",
				data: {
					score: player.score,
					time: Math.round(time),
					dev: devMode
				},
				user: user.id
			}));

			if (player.score > 150 && time > 10 && settingsStore.get("submitScores", true)) {
				promises.push(postScore(player.score, Math.round(time), devMode, version));
			} else if (player.score <= 150 || time <= 10) {
				document.getElementById("score-not-submitted").classList.toggle("no-display", false)
				document.getElementById("score-not-submitted").innerText = "Your score was not submitted because it was too low"
			} else {
				document.getElementById("score-not-submitted").classList.toggle("no-display", false)
				document.getElementById("score-not-submitted").innerText = "Score submission is disabled"
			}

			if (!devMode) promises.push(updateStats({ score: player.score, level: player.level, kills: player.kills, time: Math.floor(time) }));

			const results = await Promise.all(promises);
			if (results[1]) scoreRecordId = results[1].id;
			posted = true;
		}

		document.getElementById("stats").innerHTML = `
			<p> <strong> <!--<i class="fa-regular fa-burst fa-fw"></i>--> Total Deaths: </strong> ${user.deaths.toLocaleString()} </p>
			<p> <strong> <!--<i class="fa-regular fa-star fa-fw"></i>--> Total score: </strong> ${user.score.toLocaleString()} </p>
			<p> <strong> <!--<i class="fa-regular fa-up" fa-fw></i>--> Total levelups: </strong> ${user.levelups.toLocaleString()} </p>
			<p> <strong> <!--<i class="fa-regular fa-skull fa-fw"></i>--> Total kills: </strong> ${user.kills.toLocaleString()} </p>
			<p> <strong> <!--<i class="fa-regular fa-ranking-star fa-fw"></i>--> Highest score: </strong> ${user.highscore.toLocaleString()} </p>
			<p> <strong> <!--<i class="fa-regular fa-clock-rotate-left fa-fw"></i>--> Longest run: </strong> ${formatTime(user.highestTime)} </p>
		`;
	} else {
		document.getElementById("signInDiv").innerHTML = `<p><b>Sign in to submit your score to the leaderboard</b></p><button id="signInBtn">Sign in</button><!-- <button id="signInWithGoogleButton"> Sign in with Google </button> -->`;
		document.getElementById("stats").innerHTML = "<p><b>Sign in to see your stats</b></p>";
		setTimeout(() => {
			document.getElementById("signInBtn").addEventListener("click", async () => {
				let res = await signIn();
				if (res) {
					die(true);
				} else {
					document.getElementById("signInDiv").querySelector("b").innerText = "Sign in failed";
				}
			});
			// document.getElementById("signInWithGoogleButton").addEventListener("click", async () => await signInWithGoogle());
		}, 100);
		document.getElementById("signInBtn").addEventListener("mouseenter", () => playSound("hover"));
	}

	let page = 1;
	const scores = await getScores(page);

	const scoresContainer = document.getElementById("scores");
	scoresContainer.innerHTML = "";

	const appendScore = (score, index, offset = "") => {
		const scoreContainer = document.createElement("p");
		const scoreIndex = document.createTextNode(`${index + 1 + offset} `);
		const scoreAuthorName = document.createElement("b");

		scoreAuthorName.textContent = xssFilters.inHTMLData(score.expand.user.name);

		const scoreText = document.createTextNode(` - ${score.score} (${score.time > 0 ? formatTime(score.time) : "no time"})`);

		if (score.version) scoreContainer.setAttribute("title", `Version: ${score.version}`);
		if (scoreRecordId == score.id) scoreContainer.classList.add("highlight");

		if (score.runData) {
			scoreContainer.style.cursor = "pointer";
			scoreContainer.addEventListener("click", () => {
				showRunInfo(score);
			})
		}

		scoreContainer.append(scoreIndex, scoreAuthorName, scoreText);
		scoresContainer.appendChild(scoreContainer);
	}

	scores.forEach((score, index) => appendScore(score, index));

	let loadingScores = false;
	const gameOverElement = document.getElementById("gameOver");

	const loadMoreScores = async () => {
		if (!loadingScores && gameOverElement.scrollTop + gameOverElement.clientHeight >= gameOverElement.scrollHeight - 10) {
			loadingScores = true;
			page++;

			const newScores = await getScores(page);
			if (newScores.length > 0) {
				newScores.forEach((score, index) => appendScore(score, index, (page - 1) * 10));
			} else {
				gameOverElement.removeEventListener("scroll", loadMoreScores);
			}

			loadingScores = false;
		}
	}

	gameOverElement.addEventListener("scroll", loadMoreScores);
}

document.getElementById("viewRunInfo").addEventListener("click", () => {
	if (lastScore) {
		showRunInfo(lastScore)
	}
})

export function applyBorder(obj) {
	if (obj == player) damagePlayer(calcBorder(obj).mag * clampTime * 0.15, "border");
	obj.vel["+="]((calcBorder(obj))["*"](0.1));
}
export function getRandomBox(size) {
	let d = Math.floor(Math.random() * 4);
	switch (d) {
		case 0: // right
			return new Vector(size, Math.random() * size * 2 - size);
		case 1: // left
			return new Vector(-size, Math.random() * size * 2 - size);
		case 2: // bottom
			return new Vector(Math.random() * size * 2 - size, size);
		case 3: // top
			return new Vector(Math.random() * size * 2 - size, -size);
	}
}
export function formatTime(time = 0) {
	let sec = Math.floor(time);
	let min = Math.floor(time / 60);
	sec -= min * 60;
	let hr = Math.floor(time / 3600);
	min -= hr * 60;
	sec = sec.toString();
	if (sec.length < 2) sec = "0" + sec;
	if (hr > 0 && min.length < 2) min = "0" + min;
	return `${hr > 0 ? hr + ":" : ""}${min}:${sec}`;
}
export function getOnScreen(pos, rad) {
	if (pos.x - cam.x > size.x / 2 + rad) return false;
	if (pos.x - cam.x < -size.x / 2 - rad) return false;
	if (pos.y - cam.y > size.y / 2 + rad) return false;
	if (pos.y - cam.y < -size.y / 2 - rad) return false;
	return true;
}
function bar(p, w, val, bgCol, col, s) {
	sketch.noStroke();
	sketch.fill(bgCol);
	sketch.rect(p.x, p.y, w, s, 5);
	sketch.fill(col);
	sketch.rect(p.x, p.y, w * val, s, 5);
}
export function set(prop, val) {
	// window[prop] = val;
	switch (prop) {
		case "screenshake": return screenshake = val;
		case "cursorContract": return cursorContract = val;
		case "isFirstLevelup": return isFirstLevelup = val;
	}
}
export function get(prop) {
	// return window[prop];
	switch (prop) {
		case "screenshake": return screenshake;
		case "cursorContract": return cursorContract;
		case "isFirstLevelup": return isFirstLevelup;
	}
}
export function damagePlayer(amount, source) {
	if (amount <= 0) return;
	player.shield.regenTimeLeft = 0;
	if (player.shield.value > amount) {
		rumble(0.15, 0.35);
		player.shield.value -= amount;
		playSound("shield")
		return;
	}
	amount -= player.shield.value;
	player.shield.value = 0;
	amount *= player.damageFactor;
	player.hp -= amount;
	playSound(source == "border" ? "border" : "hurt")
	if (player.hp > 0) {
		rumble(0.2, 0.5);
	}
}

export function getVersion(version) {
	version = version.slice(1);
	return version.split(".").map(split => parseInt(split));
}

export function updateStars() {
	stars = [];
	let starSize = settings.starDetail == 0 ? 1 : settings.starDetail == 1 ? 2 : settings.starDetail == 2 ? 3 : 0;
	for (let i = 0; i < (settings.starDetail == 0 ? 10000 : settings.starDetail == 1 ? 5000 : settings.starDetail == 2 ? 3000 : 0); i++) {
		// let layer = Math.ceil(Math.random() * 3) / 3;
		let layer = Math.random();
		let data = getStarData();
		stars.push({ layer: 0.5 + layer * 0.2, col: `rgb(${data.col.x}, ${data.col.y}, ${data.col.z})`, size: (starSize + Math.random() * starSize / 2) * data.size * (1 - layer * 0.8), pos: new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1)["*"](currentLevel.size) });
	}
	/*for (let i = 0; i < 100; i++) {
		// let layer = Math.ceil(Math.random() * 3) / 3;
		let layer = Math.random();
		let rand = () => Math.round(40 - Math.pow(Math.random(), 1 / 2) * 30);
		stars.push({ layer: 0.4 + layer * 0.4, col: `rgba(${rand()}, ${rand()}, ${rand()}, ${Math.random() * 0.2 + 0.3})`, size: (50 + Math.random() * 50) * (3 - layer * 2.5), pos: new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1)["*"](currentLevel.size) });
	}*/
	stars.sort((star1, star2) => star2.layer - star1.layer);
}

function getStarData() {
	let stops = [{ col: new Vector(200, 50, 0), size: 0.5, pos: 0 }, { col: new Vector(250, 100, 0), size: 2, pos: 0.1 }, { col: new Vector(255, 200, 0), size: 1, pos: 0.3 }, { col: new Vector(255, 255, 255), size: 1, pos: 0.7 }, { col: new Vector(200, 200, 255), size: 1.5, pos: 1 }];
	let t = Math.random();
	let data;
	stops.forEach((stop, stopI) => {
		if (stopI < stops.length - 1) {
			let nextStop = stops[stopI + 1];
			if (t >= stop.pos && t < nextStop.pos) {
				let dif = (t - stop.pos) / (nextStop.pos - stop.pos);
				data = { col: Vector.lerp(stop.col, nextStop.col, dif), size: lerp(stop.size, nextStop.size, dif), pos: t };
			}
		}
	});
	return data;
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

// ********************  event listeners  ******************** //
[...document.querySelectorAll(".noClose")].forEach(elem => {
	elem.addEventListener("cancel", (event) => {
		event.preventDefault();
		setTimeout(() => {
			if (!event.target.open) {
				event.target.showModal();
			}
		}, 1)
	});
});

[...document.querySelectorAll("button,input[type='checkbox'],input[type='radio'],select")].forEach(elem => {
	elem.addEventListener("mouseenter", () => {
		playSound("hover");
	})
})

document.addEventListener("keydown", event => setKey(event, true));
document.addEventListener("keyup", event => setKey(event, false));
document.addEventListener("mousedown", () => mouseDown = true);
document.addEventListener("mouseup", () => mouseDown = false);
document.addEventListener("click", () => mouseDown = false);
document.addEventListener("mousemove", event => {
	mouse = new Vector(event.clientX, event.clientY);
	mouse["-="]((size)["/"](2));
});

document.getElementById("restart").addEventListener("click", restart);
document.getElementById("quit").addEventListener("click", () => {
	player.hp = 0;
	unpause();
});
document.getElementById("runDataClose").addEventListener("click", () => {
	document.getElementById("runData").close(); // this looks bad with an animation
})
document.getElementById("runData").addEventListener("close", () => {
	document.getElementById("gameOver").showModal();
	document.getElementById("runDataContent").innerHTML = "";
	document.getElementById("runDataUpgrades").innerHTML = "";
	document.getElementById("runDataWeapons").innerHTML = "";
})

// Snapshot mode

let wasMuted = false;
function prepareSnapshot() {
	if (!document.getElementById("snapshot-show-hud").checked) {
		let hudWasShown = showHud
		showHud = false
		wasMuted = settingsStore.get("isMuted", false);
		settingsStore.set("isMuted", true);
		if (hudWasShown !== showHud) {
			sketch.redraw();
		}
	}
	let canvas = document.querySelector("canvas");
	return canvas.toDataURL();
}
function finishSnapshot() {
	settingsStore.set("isMuted", wasMuted);
	if (!document.getElementById("snapshot-show-hud").checked) {
		showHud = true;
	}
	document.getElementById("snapshot-options").close()
	document.getElementById("pause").showModal();
}

document.getElementById("snapshot").addEventListener("click", () => {
	document.getElementById("pause").close();
	document.getElementById("snapshot-options").showModal();
})
document.getElementById("snapshot-save").addEventListener("click", () => {
	let link = document.createElement("a");
	link.href = prepareSnapshot();
	link.download = `asteroids-snapshot-${new Date().toLocaleString().replace(", ", "-").replaceAll(" ", "-")}.png`;
	link.click();
	link.remove();
	finishSnapshot();
})
document.getElementById("snapshot-copy").addEventListener("click", async () => {
	const url = prepareSnapshot();
	const blob = await (await fetch(url)).blob();
	const item = new ClipboardItem({ "image/png": blob });
	navigator.clipboard.write([item]).then(() => {
		alert("Snapshot copied to clipboard");
		finishSnapshot();
	}).catch(err => {
		console.error(err);
		alert("Failed to copy snapshot, try downloading instead.");
		finishSnapshot();
	});
})
document.getElementById("snapshot-cancel").addEventListener("click", () => {
	document.getElementById("snapshot-options").close();
	document.getElementById("pause").showModal();
})
document.getElementById("snapshot-show-hud").addEventListener('click', () => {
	document.getElementById("snapshot-show-hud-warning").classList.toggle("hidden", document.getElementById("snapshot-show-hud").checked);
})

document.getElementById("pause").addEventListener("cancel", unpause);
document.getElementById("resume").addEventListener("click", unpause);

function pause() {
	if (!paused && started && !document.querySelector("dialog[open].noPause")) {
		setTimeout(() => {
			document.getElementById("pause").showModal();
			sketch.noLoop();
			paused = true;
			document.getElementById("currentUpgrades").innerHTML = [
				`<p> Player Upgrades </p> <div> ${playerUpgrades.map(e => `<p> ${e.name} <span> ${e.times}/${e.max} </span> </p>`).join("")} </div>`,
				...player.weapons.map(weapon => `<hr> <p> ${weapon.name} <span> lvl ${weapon.level} </span> </p> <div>  ${weapon.upgrades.filter(upgrade => upgrade.times > 0).map(upgrade => `<p> ${upgrade.name} <span> ${upgrade.times}/${upgrade.max} </span> </p>`).join("")} </div>`).join("")
			].join("");
			if (document.getElementById("settings")) document.getElementById("settings").remove();
			document.querySelector("#pause>.centered").appendChild(getSettingsMenu());
		}, 100);
	}
}
function unpause() {
	if (paused && started) {
		sketch.loop();
		document.getElementById("pause").close();
		paused = false;
	}
}
function restart() {
	isFirstLevelup = true
	cheated = false
	fpsHistory = []
	unpause();
	stopGame();
	startGame(0);
	document.getElementById("gameOver").close();
}

function getSettings() {
	settings = settingsStore.getAll();
}

addEventListener("resize", () => {
	size["="](innerWidth, innerHeight);
	if (sketch) sketch.resizeCanvas(size.x, size.y);
});
addEventListener("blur", pause);

function setKey(event, state) {
	keys[event.key] = state;

	//extra keybinds
	if (started) {
		if (document.querySelector("input[type='text']:focus")) return;

		if (event.key == "z" && state) {
			settings.toggleFire = !settings.toggleFire
			settingsStore.set("toggleFire", settings.toggleFire);
		}

		if (event.key == "Escape" && state && !paused) {
			pause();
		}

		if ((event.key == "ArrowUp" || event.key == "w" || event.key == "a") && document.querySelector("dialog[open]") && state) {
			previousButton();
		}
		if ((event.key == "ArrowDown" || event.key == "s" || event.key == "d") && document.querySelector("dialog[open]") && state) {
			nextButton();
		}

		if (state && devMode) {
			const mousePos = new Vector(mouse.x + player.pos.x, player.pos.y + mouse.y);
			switch (event.key) {
				case "x":
					enemies.forEach(enemy => enemy.hp = 0);
					cheated = true
					break;

				case "c":
					enemies.forEach(enemy => {
						enemy.pos.x = mousePos.x
						enemy.pos.y = mousePos.y
					});
					cheated = true
					break;

				case "v":
					player.pos.x = mousePos.x
					player.pos.y = mousePos.y
					cheated = true
					break;
				case "P":
					if (paused) unpause();
					if (document.head.querySelector("script[src='https://cdn.jsdelivr.net/npm/eruda']")) break;

					const erudaScript = document.createElement("script");
					erudaScript.src = "https://cdn.jsdelivr.net/npm/eruda";
					document.head.appendChild(erudaScript);
					erudaScript.onload = () => eruda.init();

					break;
				case "b":
					settings.emojiMovie = !settings.emojiMovie;
					break;
				case "m":
					settings.mousePan = !settings.mousePan;
					break;
				case "n":
					settings.noBG = !settings.noBG;
					break;
				case "l":
					settings.dimBG = !settings.dimBG;
					break;
				case ",":
					settings.starDetail--;
					if (settings.starDetail < 0) settings.starDetail = 3;
					updateStars();
					break;
				case ".":
					settings.starDetail++;
					if (settings.starDetail > 3) settings.starDetail = 0;
					updateStars();
					break;
				case "k":
					updateStars();
					break;
				case "g":
					player.maxHp = Infinity;
					player.hp = Infinity;
					cheated = true
					break;
				case "h":
					player.hp = player.maxHp;
					cheated = true
					break;
				case "i":
					player.xp = player.levelUp;
					cheated = true
					break;
				default:
					if ("1234567890".split("").includes(event.key)) {
						if (enemyTypes[parseInt(event.key)]) {
							enemyTypes[parseInt(event.key)].create({ mode: 0, index: 0, max: 1, pos: mousePos, vel: new Vector(10 + Math.random() * 30, 0).rotate(Math.random() * 2 * Math.PI), size: 60 });
							cheated = true;
						}
					}
					break;
			}
		}
	}
}

export function getRunInfo() {
	const result = {}
	result.playerUpgrades = playerUpgrades.map(({ name, times, max }) => ({ name, times, max }));
	result.weapons = player.weapons.map(({ name, upgrades }) => ({ name, upgrades: upgrades.map(({ name, times, max }) => ({ name, times, max })) }));
	result.enemyCount = enemies.length;
	result.kills = player.kills;
	if (fpsHistory.length > 0) {
		result.averageFps = parseFloat((fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length).toFixed(3));
		result.minFps = Math.min(...fpsHistory);
		result.maxFps = Math.max(...fpsHistory);
	}
	return result
}

function nextButton() {
	let btns = [...document.querySelectorAll("dialog[open] button"), ...document.querySelectorAll("dialog[open] input[type='checkbox']")];
	if (btns.length == 0) return;
	let activeI = btns.indexOf(document.activeElement);
	if (activeI == -1) activeI = 0;
	else {
		activeI++;
		if (activeI > btns.length - 1) {
			activeI = 0;
		}
	}
	btns[activeI].focus();
}
function previousButton() {
	let btns = [...document.querySelectorAll("dialog[open] button"), ...document.querySelectorAll("dialog[open] input[type='checkbox']")];
	if (btns.length == 0) return;
	let activeI = btns.indexOf(document.activeElement);
	if (activeI == -1) activeI = 0;
	else {
		activeI--;
		if (activeI < 0) {
			activeI = btns.length - 1;
		}
	}
	btns[activeI].focus();
}

export function onGamepadButton(button, state) {
	if (button == "rightPause" && state && started) {
		if (paused) unpause();
		else pause();
	}

	if (button == "dpadUp" && state) {
		previousButton();
	}
	if (button == "dpadDown" && state) {
		nextButton();
	}
	if (button == "bottom" && state) {
		document.activeElement.click();
	}

	if (button == "rightBumper" && state) {
		settings.toggleFire = !settings.toggleFire;
	}
}

requestAnimationFrame(updateGamepad);