import { getUnlocks, setUnlocks, unlocks, user } from "./pocketbase";

class Achievement {
	/**
	 * 
	 * @param {string} name - The name of the unlock.
	 * @param {string} desc - The description of the unlock.
	 * @param {string} id - The id of the unlock.
	 * @param {Function} progress - The function to get progress of the unlocks.
	 * @param {number} max - The required progress of the unlock.
	 * @param {Function} get - The function to call once unlocked.
	 */
	constructor({ name, desc, id, progress, max, get }) {
		this.name = name;
		this.desc = desc;
		this.id = id;
		this.progress = progress;
		this.max = max;
		this.get = get;
	}
	check() {
		if (this.progress() >= this.max) {
			this.get();
			setUnlocks();
			return true;
		}
		return false;
	}
}

const achievements = [
	new Achievement({
		name: "Bloody",
		desc: "Kill 100 enemies",
		id: "bloody",
		progress: () => user.kills,
		max: 100,
		get: () => { unlocks.weapons.gun.unlocks.multishotEvery = 5; }
	})
];

export default achievements;