import { editableSettings, settings, settingsStore } from "../main";

export function getSettingsMenu() {
	let elem = document.createElement("div");
	elem.id = "settings";
	editableSettings.forEach(setting => {
		const container = document.createElement("div");
		container.classList.add("setting-container");
		elem.appendChild(container);
		if (setting.type == "checkbox") {
			let settingElem = document.createElement("input");
			settingElem.type = "checkbox";
			settingElem.setAttribute("for", setting.var);
			settingElem.checked = settingsStore.get(setting.var, settingsStore.options.default[setting.var]);
			settingElem.addEventListener("change", () => {
				settings[setting.var] = settingElem.checked;
				settingsStore.set(setting.var, settingElem.checked);
				if (setting.onChange) {
					setting.onChange();
				}
			});

			let label = document.createElement("label");
			label.appendChild(document.createTextNode(setting.name));
			label.setAttribute("for", setting.var);
			label.addEventListener("click", () => settingElem.click());

			container.appendChild(label);
			container.appendChild(settingElem);

		} else if (setting.type == "select") {
			let label = document.createElement("label");
			label.appendChild(document.createTextNode(setting.name));
			label.setAttribute("for", setting.var);

			let select = document.createElement("select");
			select.setAttribute("for", setting.var);
			setting.options.forEach((option, optionI) => {
				let label = setting.labels[optionI];
				let opt = document.createElement("option");
				if (option == settings[setting.var]) opt.selected = true;
				opt.appendChild(document.createTextNode(label));
				opt.value = option;
				select.appendChild(opt);
			});
			select.addEventListener("change", () => {
				settings[setting.var] = select.value;
				settingsStore.set(setting.var, select.value);
				if (setting.onChange) {
					setting.onChange();
				}
			});

			container.appendChild(label);
			container.appendChild(select);
		}
	});
	return elem;
}