import { formatTime, getRarity, playerUpgrades, registerBackAction } from "../main";
import weapons from "../weapon-types";

export function showRunInfo(score) {
	document.getElementById("gameOver").close();
	document.getElementById("runData").showModal();

	const keyLabels = {
		kills: "Kills",
		maxFps: "Highest FPS",
		minFps: "Lowest FPS",
	}

	const content = document.getElementById("runDataContent");

	function addLabel(key, value, parent) {
		const container = document.createElement("div");
		const keyLabel = document.createElement("strong");
		keyLabel.innerText = key + ":";
		const valueElement = document.createElement("span");
		valueElement.innerText = value;
		container.appendChild(keyLabel);
		container.appendChild(valueElement);
		parent.appendChild(container);
		return container;
	}
	const scoreValueOrder = ["user", "version", "score", "time"];
	scoreValueOrder.forEach((key) => {
		if (Object.hasOwn(score, key)) {
			switch (key) {
				case "user":
					addLabel("User", score.expand.user.name, content);
					break;
				case "score":
					addLabel("Score", score.score.toLocaleString(), content);
					break;
				case "time":
					addLabel("Time", formatTime(score.time), content);
					break;
				case "version":
					addLabel("Version", score.version.replace("v", ""), content);
					break;
				default:
					break;
			}
		}
	})
	for (let key in keyLabels) {
		if (Object.hasOwn(score.runData, key) && Object.hasOwn(keyLabels, key)) {
			addLabel(keyLabels[key], score.runData[key], content);
		}
	}
	const upgradesContent = document.getElementById("runDataUpgrades")
	const upgrades = score.runData.playerUpgrades?.filter(upgrade => upgrade.times > 0);
	if (upgrades) {
		upgrades.forEach(upgrade => {
			const container = addLabel(upgrade.name, upgrade.times + "/" + upgrade.max, upgradesContent);
			const upgradeData = playerUpgrades.find(x => x.name == upgrade.name);
			if (upgradeData) {
				const rarity = getRarity(upgradeData.weight);
				if (rarity !== "common") {
					container.classList.add(rarity);
				}
			}
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
			const container = addLabel(upgrade.name, upgrade.times + "/" + upgrade.max, weaponsContent);
			const upgradeData = weapons.find(x => x.name == weapon.name)?.upgrades.find(x => x.name == upgrade.name);
			if (upgradeData) {
				const rarity = getRarity(upgradeData.weight);
				if (rarity !== "common") {
					container.classList.add(rarity);
				}
			}
		})
	})

	registerBackAction(() => {
		document.getElementById("runData").close();
		document.getElementById("gameOver").showModal();
	})
}