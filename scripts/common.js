export const options = {
	entryPoints: ["src/main.js"],
	bundle: true,
	sourcemap: true,
	outdir: "dist",
};

export const define = {
	__POCKETBASE_URL__: '"' + (process.env.POCKETBASE_URL || "https://asteroids.pockethost.io") + '"',
};
