import { getRarity, playerUpgrades } from "../main";
import weapons from "../weapon-types";

export function showRunInfo(score) {
	document.getElementById("gameOver").close();
	document.getElementById("runData").showModal();

	const keyLabels = {
		kills: "Kills",
		enemyCount: "Enemies",
		maxFps: "Highest FPS",
		minFps: "Lowest FPS",
	}

	const content = document.getElementById("runDataContent");
	for (let key in keyLabels) {
		console.log(key, score.runData[key])
		if (score.runData[key]) {
			const container = document.createElement("div");
			const keyLabel = document.createElement("strong");
			keyLabel.innerText = keyLabels[key] + ":";
			const value = document.createElement("span");
			value.innerText = score.runData[key].toLocaleString();
			container.appendChild(keyLabel);
			container.appendChild(value);
			content.appendChild(container);
		}
	}
	const upgradesContent = document.getElementById("runDataUpgrades")
	const upgrades = score.runData.playerUpgrades?.filter(upgrade => upgrade.times > 0);
	if (upgrades) {
		upgrades.forEach(upgrade => {
			const container = document.createElement("div");
			const keyLabel = document.createElement("strong");
			keyLabel.innerText = upgrade.name + ":";
			const value = document.createElement("span");
			value.innerText = upgrade.times + "/" + upgrade.max;
			const upgradeData = playerUpgrades.find(x => x.name == upgrade.name);
			console.log(upgradeData)
			if (upgradeData) {
				const rarity = getRarity(upgradeData.weight);
				if (rarity !== "common") {
					container.classList.add(rarity);
				}
			}
			container.appendChild(keyLabel);
			container.appendChild(value);
			upgradesContent.appendChild(container);
		})
	}
	if (upgrades.length == 0) {
		upgradesContent.innerText = "No upgrades"
	}

	const weaponsContent = document.getElementById("runDataWeapons")
	score.runData.weapons.forEach((weapon) => {
		const weaponHeader = document.createElement("h3");
		weaponHeader.innerText = weapon.name;
		weaponsContent.appendChild(weaponHeader);
		const upgrades = weapon.upgrades.filter(upgrade => upgrade.times > 0);
		upgrades.forEach(upgrade => {
			const container = document.createElement("div");
			const keyLabel = document.createElement("strong");
			keyLabel.innerText = upgrade.name + ":";
			const value = document.createElement("span");
			value.innerText = upgrade.times + "/" + upgrade.max;
			const upgradeData = weapons.find(x => x.name == weapon.name)?.upgrades.find(x => x.name == upgrade.name);
			console.log(upgradeData)
			if (upgradeData) {
				const rarity = getRarity(upgradeData.weight);
				if (rarity !== "common") {
					container.classList.add(rarity);
				}
			}
			container.appendChild(keyLabel);
			container.appendChild(value);
			weaponsContent.appendChild(container);
		})
	})
}