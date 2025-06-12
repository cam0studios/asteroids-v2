const current_sha = __CURRENT_SHA__;
const commitsUrl = "https://api.github.com/repos/cam0studios/asteroids-v2/commits?per_page=5";
const updateUrl = "https://raw.githubusercontent.com/cam0studios/asteroids-v2/refs/heads/gh-pages/singlefile.html";

// check for updates
fetch(commitsUrl)
	.then((res) => res.json())
	.then((data) => {
		if (data && data[0] && data[0].sha) {
			console.debug(`Latest sha: ${data[0].sha}\nCurrent sha: ${current_sha}`);
			if (data[0].sha !== current_sha) {
				function getVersionAge() {
					let age;
					data.forEach((commit, i) => {
						if (commit.sha === current_sha) {
							age = i;
						}
					});
					if (!age) {
						age = "5+";
					}
					return age;
				}
				console.debug("Update available");
				document.getElementById("startScreen").remove();
				// download attribute does not work on cross origin resources
				fetch(updateUrl).then((res) => {
					res.blob().then((blob) => {
						document.getElementById("updateDownload").parentElement.href = URL.createObjectURL(blob);
						document.getElementById("updateDownload").parentElement.download =
							`asteroids-${data[0].sha}.html`;
						document.getElementById("update").showModal();
						const versionAge = getVersionAge();
						document.getElementById("updateAge").querySelector("strong").innerText = versionAge;
						if (typeof versionAge === "number" && versionAge === 1) {
							document.getElementById("updateAge").querySelector("span").innerText = "version";
						}
					});
				});
			} else {
				console.debug("Up to date");
				document.querySelector("#start").disabled = false;
			}
		}
	})
	.catch(() => {
		console.warn("Failed to check for updates");
		document.querySelector("#start").disabled = false;
	})
	.catch(() => {
		console.warn("Failed to check for updates");
		document.querySelector("#start").disabled = false;
	});
