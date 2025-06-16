import PocketBase from "pocketbase";
import Toastify from "toastify";
import { cheated, devMode, formatTime, getRunInfo, settings } from "./main";
const url = __POCKETBASE_URL__;
export const pb = new PocketBase(url);
import xssFilters from "xss-filters";
import weapons from "./weapon-types";
import achievements from "./achievements";

export var user,
	signedIn = false,
	usersCollection = __IS_DEVELOPMENT__ ? "testUsers" : "users";

// pb.authStore.clear();

user = {
	stats: {},
};

if (pb.authStore.model) {
	(async () => {
		try {
			user = await pb.collection(usersCollection).getOne(pb.authStore.model.id);
			userUpdated();
			signedIn = true;
		} catch (err) {
			console.error(err);
			reportError(err);
			signOut();
		}
	})();
}

export async function postScore(score, time, dev, version) {
	if (cheated) return;
	try {
		return await pb.collection("scores").create({
			user: user.id,
			score,
			time,
			dev,
			version,
			runData: getRunInfo(),
		});
	} catch (err) {
		console.error(err);
		reportError(err);
	}
}

export async function updateStats({ score, level, kills, time, enemyKills }) {
	try {
		let newEnemyKills = user.stats?.enemyKills || {};
		for (let enemy in enemyKills) {
			if (!(enemy in newEnemyKills)) newEnemyKills[enemy] = 0;
			newEnemyKills[enemy] += enemyKills[enemy];
		}
		await pb.collection(usersCollection).update(user.id, {
			stats: {
				deaths: (user.stats?.deaths || user.deaths || 0) + 1,
				score: (user.stats?.score || user.score || 0) + score,
				levelups: (user.stats?.levelups || user.levelups || 0) + level,
				kills: (user.stats?.kills || user.kills || 0) + kills,
				highscore: Math.max(user.stats?.highscore || user.highscore || 0, score),
				highestTime: Math.max(user.stats?.highestTime || user.highestTime || 0, time),
				enemyKills: newEnemyKills,
			},
		});
		user = await pb.collection(usersCollection).getOne(pb.authStore.model.id);
		userUpdated();
		return user;
	} catch (err) {
		console.error(err);
		reportError(err);
	}
}

export var unlocks = {};

export async function getUnlocks() {
	let def = {
		weapons: weapons.reduce((total, weapon) => {
			total[weapon.id] = {
				unlocked: weapon.defaultUnlocked,
				unlockedUpgrades: weapon.upgrades.reduce((totalUpgrades, upgrade) => {
					totalUpgrades[upgrade.id] = upgrade.defaultUnlocked;
					return totalUpgrades;
				}, {}),
				unlocks: weapon.defaultUnlocks,
			};
			return total;
		}, {}),
		playerUpgrades: {
			health: true,
			speed: true,
			shield: false,
			resistance: false,
			recovery: false,
		},
		other: {
			shield: false,
		},
	};
	achievements.forEach((achievement) => {
		def = achievement.getCheck(def);
	});
	unlocks = def;
	return def;
}

export async function postFeed(event) {
	if (!settings.sendFeedEvents) return;
	if (cheated) return;
	try {
		return await pb.collection("feed").create({
			user: user.id,
			data: event.data,
			type: event.type,
			dev: event.dev,
		});
	} catch (err) {
		console.error(err);
		reportError(err);
	}
}

let feedConnected = false;
Toastify.setOption("position", "bottom-left");
export async function subscribeToFeed() {
	if (feedConnected) return;
	pb.collection("feed")
		.subscribe(
			"*",
			function (e) {
				if (e.action == "create" && e.record.type == "death" && settings.showFeed) {
					Toastify.info(
						xssFilters.inHTMLData(e.record.expand.user.name) + " died",
						'<i class="fa-regular fa-clock"></i> ' +
							formatTime(e.record.data.time) +
							' / <i class="fa-regular fa-star"></i> ' +
							xssFilters.inHTMLData(e.record.data.score),
						5000
					);
				}
			},
			{ expand: "user" }
		)
		.then(function () {
			console.debug("Connected to live feed successfully");
			feedConnected = true;
			window.ASTEROIDS_FEED_CONNECTED = true;
		});
}

export async function getUsers() {
	try {
		return await pb.collection(usersCollection).getFullList({});
	} catch (err) {
		console.error(err);
		reportError(err);
		return [];
	}
}

export async function getScores(page = 1, sort = "-score") {
	const scoresPerPage = 10;
	try {
		const scores = await pb
			.collection("scores")
			.getList(page, scoresPerPage, { expand: "user", sort, filter: `dev=${devMode}` });
		return scores.items; //.filter(e => getVersion(e.version)[1] >= 4 && getVersion(e.version)[2] >= 0);
	} catch (err) {
		console.error(err);
		reportError(err);
		return [];
	}
}

export async function signIn() {
	let username = await getUsername("Enter a username");
	if (!username) return;
	let users = await getUsers();
	if (users.map((otherUser) => otherUser.username).includes(username)) {
		let password = await getPassword("Enter your password");
		if (!password) return;
		try {
			let authData = await pb.collection(usersCollection).authWithPassword(username, password);
			user = authData.record;
			userUpdated();
			signedIn = true;
			return authData;
		} catch (err) {
			console.error(err);
			reportError(err);
			return;
		}
	} else {
		let password = await getPassword("Create a password");
		if (!password) return;
		user = await pb
			.collection(usersCollection)
			.create({ username, password, name: username, passwordConfirm: password });
		try {
			let authData = await pb.collection(usersCollection).authWithPassword(username, password);
			user = authData.record;
			userUpdated();
			signedIn = true;
			return authData;
		} catch (err) {
			console.error(err);
			reportError(err);
			return;
		}
	}
}

export async function signInWithGoogle() {
	const authData = await pb.collection(usersCollection).authWithOAuth2({ provider: "google" });
}

export async function getUsername(prompt) {
	let dialog = document.getElementById("username");
	dialog.showModal();
	dialog.querySelector("h2").innerText = prompt;
	return new Promise((res, rej) => {
		dialog.querySelector(".prompt").addEventListener("keypress", (event) => {
			if (event.key !== "Enter") return;
			let username = event.currentTarget.value.toLowerCase();
			res(username);
			dialog.close();
		});
		dialog.querySelector("button").addEventListener("click", () => {
			let username = dialog.querySelector(".prompt").value.toLowerCase();
			res(username);
			dialog.close();
		});
	});
}

export async function getPassword(prompt) {
	let dialog = document.getElementById("password");
	dialog.showModal();
	dialog.querySelector("h2").innerText = prompt;
	return new Promise((res, rej) => {
		dialog.querySelector(".prompt").addEventListener("keypress", (event) => {
			if (event.key !== "Enter") return;
			let password = event.currentTarget.value;
			res(password);
			dialog.close();
		});
		dialog.querySelector("button").addEventListener("click", () => {
			let password = dialog.querySelector(".prompt").value;
			res(password);
			dialog.close();
		});
	});
}

export function signOut() {
	pb.authStore.clear();
	signedIn = false;
	user = null;
	userUpdated();
}

function userUpdated() {
	const event = new CustomEvent("userupdate", { detail: { user } });
	window.dispatchEvent(event);
}

addEventListener("error", (event) => {
	console.error("Reporting error:", event);
	try {
		pb.collection("errors").create({
			error: {
				message: event.message,
				file: event.filename,
				line: event.lineno,
				column: event.colno,
				error: event.error.toString(),
			},
			dev: devMode,
			user: signedIn ? user.id : null,
		});
	} catch (err) {
		console.error("Failed to report error:", err);
	}
});
