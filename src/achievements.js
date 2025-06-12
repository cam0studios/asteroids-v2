import { formatTime, playerUpgrades } from "./main";
import { getUnlocks, user } from "./pocketbase";
import weapons from "./weapon-types";

// achievements: what the player achieves, based on stats
// unlocks: what weapons and upgrades the player has, based on achievements

class Achievement {
	/**
	 *
	 * @param {string} name - The name of the unlock.
	 * @param {string} desc - The description of the unlock.
	 * @param {string} reward - The reward for unlocking.
	 * @param {string} id - The id of the unlock.
	 * @param {Function} progress - The function to get progress of the achievement.
	 * @param {number} max - The required progress of the unlock.
	 * @param {Function} get - The function to call once unlocked.
	 * @param {Function} getString - The formatter function for progress and max
	 */
	constructor({ name, desc, reward, id, progress, max, get, getString = (prop) => prop }) {
		this.name = name;
		this.desc = desc;
		this.reward = reward;
		this.id = id;
		this.progress = progress;
		this.max = max;
		this.get = get;
		this.getString = getString;
	}
	check() {
		return this.progress() >= this.max;
	}
	getCheck(unlocks) {
		if (this.check()) {
			return this.get(unlocks);
		} else {
			return unlocks;
		}
	}
}
class AchievementSet {
	#props;
	/**
	 * Set of achievements to be progressively unlocked
	 * @param {Achievement[]} levels - List of Achievement instances for each level
	 * @param {string} id - ID of the set
	 * @param {object} props - Default properties for each achievement
	 */
	constructor({ levels, id, props }) {
		this.levels = levels;
		this.id = id;
		this.#props = props;
		for (let level of levels) {
			for (let prop in props) {
				if (!(prop in level) || level[prop] === undefined || level[prop].toString() == "(prop) => prop") {
					level[prop] = props[prop];
				}
			}
		}
	}
	getProp(prop) {
		if (this.level() in this.levels) return this.levels[this.level()][prop];
		else if (this.#props[prop] !== undefined) return this.#props[prop];
		else return this.levels[this.levels.length - 1][prop];
	}
	get name() {
		return this.getProp("name");
	}
	get desc() {
		return this.getProp("desc");
	}
	get reward() {
		return this.getProp("reward");
	}
	get max() {
		return this.getProp("max");
	}
	progress() {
		return this.getProp("progress")();
	}
	check() {
		return this.progress() >= this.max;
	}
	getString(value) {
		return this.getProp("getString")(value);
	}
	level() {
		for (let i = 0; i < this.levels.length; i++) {
			if (!this.levels[i].check()) {
				return i;
			}
		}
		return this.levels.length;
	}
	get(unlocks) {
		for (let i = 0; i < this.levels.length; i++) {
			unlocks = this.levels[i].get(unlocks);
		}
		return unlocks;
	}
	getCheck(unlocks) {
		for (let i = 0; i < this.level(); i++) {
			unlocks = this.levels[i].getCheck(unlocks);
		}
		return unlocks;
	}
}

const achievements = [
	new AchievementSet({
		id: "bloody",
		props: {
			name: "Bloody",
			progress: () => user.stats?.kills || 0,
			desc: "Kill enemies",
			reward: "Gun gains multishot from level ups",
		},
		levels: [
			new Achievement({
				desc: "Kill 500 enemies",
				reward: "Gun gains multishot every 10 levels",
				id: "bloody-1",
				max: 500,
				get: (unlocks) => {
					unlocks.weapons.gun.unlocks.multishotEvery = 10;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Kill 5000 enemies",
				reward: "Gun gains multishot every 5 levels",
				id: "bloody-2",
				max: 5000,
				get: (unlocks) => {
					unlocks.weapons.gun.unlocks.multishotEvery = 5;
					return unlocks;
				},
			}),
		],
	}),
	new AchievementSet({
		id: "survivor",
		props: {
			name: "Survivor",
			progress: () => user.stats?.highestTime || 0,
			getString: formatTime,
			desc: "Survive for some time",
			reward: "Shield upgrades",
		},
		levels: [
			new Achievement({
				desc: "Survive for 2 minutes",
				reward: "Unlocks shield",
				id: "survivor-1",
				max: 2 * 60,
				get: (unlocks) => {
					unlocks.other.shield = true;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Survive for 3 minutes",
				reward: "Unlocks shield upgrade",
				id: "survivor-2",
				max: 3 * 60,
				get: (unlocks) => {
					unlocks.playerUpgrades.shield = true;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Survive for 4 minutes",
				reward: "Unlocks resistance and recovery upgrades",
				id: "survivor-3",
				max: 4 * 60,
				get: (unlocks) => {
					unlocks.playerUpgrades.resistance = true;
					unlocks.playerUpgrades.recovery = true;
					return unlocks;
				},
			}),
		],
	}),
	new AchievementSet({
		id: "highscore",
		props: {
			name: "High Scorer",
			progress: () => user.stats?.highscore || 0,
			desc: "Score in one run",
			reward: "Gun upgrades",
		},
		levels: [
			new Achievement({
				desc: "Score 5,000 in one run",
				reward: "Unlocks piercing upgrade",
				id: "highscore-1",
				max: 5000,
				get: (unlocks) => {
					unlocks.weapons.gun.unlockedUpgrades.piercing = true;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Score 10,000 in one run",
				reward: "Unlocks fire and ice upgrades",
				id: "highscore-2",
				max: 10000,
				get: (unlocks) => {
					unlocks.weapons.gun.unlockedUpgrades.fire = true;
					unlocks.weapons.gun.unlockedUpgrades.ice = true;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Score 15,000 in one run",
				reward: "Unlocks guardian",
				id: "highscore-3",
				max: 15000,
				get: (unlocks) => {
					unlocks.weapons.guardian.unlock = true;
					return unlocks;
				},
			}),
		],
	}),
	new AchievementSet({
		id: "explorer",
		props: {
			name: "Explorer",
			desc: "Kill enemy types",
			reward: "Unlocks player hp upgrades",
		},
		levels: [
			new Achievement({
				desc: "Kill 5 turrets",
				reward: "Unlocks resistance upgrade",
				id: "explorer-1",
				max: 5,
				progress: () => {
					return user.stats?.enemyKills?.turret || 0;
				},
				get: (unlocks) => {
					unlocks.playerUpgrades.resistance = true;
					return unlocks;
				},
			}),
			new Achievement({
				desc: "Kill 1 boss",
				reward: "Unlocks recovery upgrade",
				id: "explorer-2",
				max: 1,
				progress: () => {
					return user.stats?.enemyKills?.boss || 0;
				},
				get: (unlocks) => {
					unlocks.playerUpgrades.recovery = true;
					return unlocks;
				},
			}),
		],
	}),
];

export default achievements;
