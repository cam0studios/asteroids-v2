import { getUnlocks, user } from "./pocketbase";

class Achievement {
	/**
	 * 
	 * @param {string} name - The name of the unlock.
	 * @param {string} desc - The description of the unlock.
	 * @param {string} reward - The reward for unlocking.
	 * @param {string} id - The id of the unlock.
	 * @param {Function} progress - The function to get progress of the unlocks.
	 * @param {number} max - The required progress of the unlock.
	 * @param {Function} get - The function to call once unlocked.
	 */
	constructor({ name, desc, reward, id, progress, max, get }) {
		this.name = name;
		this.desc = desc;
		this.reward = reward;
		this.id = id;
		this.progress = progress;
		this.max = max;
		this.get = get;
	}
	check() {
		return this.progress() >= this.max;
	}
}

const achievements = [
	new Achievement({
		name: "Bloody",
		desc: "Kill 100 enemies",
		reward: "Gun gains multishot every 10 levels",
		id: "bloody",
		progress: () => user.kills,
		max: 100,
		get: (unlocks) => { unlocks.weapons.gun.unlocks.multishotEvery = 10; return unlocks; }
	})
];

export default achievements;