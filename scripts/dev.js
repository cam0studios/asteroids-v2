import * as esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy';
import { lessLoader } from 'esbuild-plugin-less';
import common from './common';
import chalk from 'chalk';

const ctx = await esbuild.context({
	...common,
	define: {
		'__IS_DEVELOPMENT__': 'true',
	},
	plugins: [
		copy({
			resolveFrom: 'cwd',
			assets: {
				from: ['./public/**/*'],
				to: ['./dist']
			}
		}),
		lessLoader(),
		{
			name: 'rebuild-notify',
			setup(build) {
				build.onStart(() => {
					if (process.env.DEV_DISABLE_REBUILD_LOGGING !== "true") {
						console.log(chalk.gray(`[watch] build started`));
					}
				})
				build.onEnd(result => {
					if (process.env.DEV_DISABLE_REBUILD_LOGGING !== "true") {
						if (result.errors.length === 0 && result.warnings.length === 0) {
							console.log(chalk.gray(`[watch] build finished`));
							return;
						}
						console.log(`${chalk.gray(`[watch] build finished with ${chalk.redBright(result.errors.length + (result.errors.length == 1 ? " error" : " errors"))} and ${chalk.yellow(result.warnings.length + (result.warnings.length == 1 ? " warning" : " warnings"))}`)}`);
					}
				})
			},
		}
	]
})

ctx.watch({})

console.log("Listening on port " + chalk.yellow(process.env?.DEV_ESBUILD_PORT || 8000));
await ctx.serve({
	servedir: "dist",
	port: parseInt(process.env?.DEV_ESBUILD_PORT || '8000'),
	onRequest: (req) => {
		if (process.env?.DEV_DISABLE_REQUEST_LOGGING == "true") return;
		console.log(`${req.remoteAddress} - ${chalk.yellow(req.method)} ${req.path} (${chalk.green(req.status)} in ${chalk.yellowBright(req.timeInMS + "ms")})`);
	}
})