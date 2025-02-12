import { addWeapon, closeWithAnimation, get, getRarity, player, playerUpgrades, set, sketch } from "../main";
import { playSound } from "./sound";
import weapons from "../weapon-types";

export function levelUp() {
	if (get("isFirstLevelup")) {
		set("isFirstLevelup", false);
	} else {
		playSound("levelup")
	}
	player.level++;
	sketch.noLoop();
	paused = true;
	player.xp -= player.levelUp;
	player.levelUp *= 1.2;
	document.getElementById("upgradeMenu").showModal();
	
	let content = "";
	let choices = [];
	playerUpgrades.filter(upgrade => upgrade.times < upgrade.max).forEach(upgrade => { for (let _ = 0; _ < upgrade.weight; _ += 0.05) choices.push({ type: 0, val: upgrade }) });
	player.weapons.forEach((weapon, weaponI) => {
		weapon.upgrades
			.filter(upgrade => {
				return upgrade.times < upgrade.max &&
					!weapon.upgrades
						.filter(x => x.times > 0)
						.some(x => x.incompatible?.includes(upgrade.name));
			})
			.forEach(upgrade => {
				for (let _ = 0; _ < upgrade.weight; _ += 0.05) {
					choices.push({ type: 1, val: upgrade, i: weaponI });
				}
			});
	});
	weapons.forEach(weapon => {
		if (player.weapons.find(e => e.id == weapon.id)) return;
		for (let _ = 0; _ < weapon.weight; _ += 0.05) choices.push({ type: 2, id: weapon.id, val: weapon });
	});
	
	let chosen = [];
	for (let _ = 0; _ < 3; _++) {
		if (choices.length > 0) {
			let rand = Math.floor(Math.random() * choices.length);
			chosen.push(choices[rand]);
			choices = choices.filter(e => JSON.stringify(e) != JSON.stringify(choices[rand]));
		}
	}
	if (chosen.length == 0) chosen.push({ type: -1, val: { name: "Healing", desc: "Heal 40 HP", func: () => player.hp += 40, max: 1, times: 0 } });
	
	function getDescription(option) {
		if (typeof option.val.desc == "string") return option.val.desc;
		if (Array.isArray(option.val.desc)) return option.val.desc[option.val.times] || option.val.desc[option.val.desc.length - 1];
	}
	
	chosen.forEach((option, i) => {
		content += `<button id="option${i}" class="upgrade-choice ${getRarity(option.val.weight)}"><h2>${option.type == 1 ? `${player.weapons[option.i].name} - ` : ""}${option.val.name}</h2><p>${getDescription(option)}</p>` + (option.type != 2 ? `<p>${option.val.times}/${option.val.max}</p>` : "") + "</button>";
	});
	
	document.getElementById("options").innerHTML = content;
	
	document.getElementById("options").querySelectorAll("button").forEach(button => button.addEventListener("mouseenter", () => {
		playSound("hover");
	}))
	
	document.getElementById("options").querySelector("button").focus();
	
	chosen.forEach((option, optionI) => {
		document.getElementById(`option${optionI}`).addEventListener("click", () => {
			player.hp += 15;
			switch (option.type) {
				case 0:
					option.val.times++;
					option.val.func(player);
					break;
				case 1:
					option.val.times++;
					option.val.func(player.weapons[option.i]);
					player.weapons[option.i].upgrade(player.weapons[option.i]);
					break;
				case 2:
					addWeapon(option.id);
					break;
			}
			document.querySelectorAll(".upgrade-choice").forEach(button => button.disabled = true);
			closeWithAnimation(document.getElementById("upgradeMenu"), "shrink-out-vertical", 150);
			setTimeout(() => {
				sketch.loop();
				paused = false;
			}, 150)
		});
	});
}