import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy';
import { lessLoader } from 'esbuild-plugin-less';
import { options as commonOptions, define as commonDefinitions } from './common';
import jsdom from 'jsdom';
import fs from 'fs';
import { $ } from 'bun';

console.time("Single file build")

const shaOut = await $`git rev-parse HEAD`.quiet();
const sha = shaOut.stdout.toString().trim();

const contentScriptText = fs.readFileSync(`scripts/singlefile.content.js`, 'utf-8');

esbuild.build({
    ...commonOptions,
    minify: true,
	sourcemap: false,
    define: {
        '__IS_DEVELOPMENT__': 'false',
        ...commonDefinitions
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
			name: 'singlefile',
			setup(build) {
				build.onEnd(result => {
					let js = fs.readFileSync("dist/main.js", 'utf-8');
					const css = fs.readFileSync("dist/main.css", 'utf-8');
					const html = fs.readFileSync("dist/index.html", 'utf-8');
					const sounds = fs.readFileSync("src/data/sounds.json", 'utf-8');
					const soundsData = JSON.parse(sounds);

					const dom = new jsdom.JSDOM(html);
					dom.window.document.head.querySelector("link[href='main.css']").remove();
					dom.window.document.head.querySelector("script[src='main.js']").remove();

					for (let soundId in soundsData) {
						if (Array.isArray(soundsData[soundId])) {
							for (let sound of soundsData[soundId]) {
								const audioFile = fs.readFileSync("public/assets/sound/" + sound.sound);
								const base64 = audioFile.toString('base64');
								js = js.replace(sound.sound, `data:audio/${sound.sound.split('.').pop()};base64,${base64}`);
							}
							continue;
						}
						const audioFile = fs.readFileSync("public/assets/sound/" + soundsData[soundId].sound);
						const base64 = audioFile.toString('base64');
						js = js.replace(soundsData[soundId].sound, `data:audio/${soundsData[soundId].sound.split('.').pop()};base64,${base64}`);
					}

					const links = dom.window.document.head.querySelectorAll("link");
					links.forEach(link => {
						if (link.rel == "stylesheet") {
							let contents = fs.readFileSync("dist/" + link.getAttribute("href"), 'utf-8');
							const style = dom.window.document.createElement('style');
							const fontRegex = /url\(([^.]+.(woff2|ttf))\)/g;
							const fonts = contents.matchAll(fontRegex);
							for (const font of fonts) {
								const fontContents = fs.readFileSync("dist/assets/fonts/" + font[1]);
								const base64 = fontContents.toString('base64');
								contents = contents.replace(font[0], `url("data:application/font-${font[2]};base64,${base64}")`);
							}
							style.textContent = contents;
							link.remove()
							dom.window.document.head.appendChild(style);
							return;
						}
						const mime = link.getAttribute('x-mime-type')
						if (!mime) {
							console.warn(`No mime type found for link ${link.href}`);
							return;
						};
						const contents = fs.readFileSync("dist/" + link.getAttribute("href"));
						const base64 = contents.toString('base64');
						link.href = `data:${mime};base64,${base64}`;
					})

					const images = dom.window.document.querySelectorAll("img");
					images.forEach(img => {
						const src = img.getAttribute("src");
						const mime = img.getAttribute('x-mime-type')
						if (!mime) {
							console.warn(`No mime type found for image ${src}`);
							return;
						};
						const contents = fs.readFileSync("dist/" + src);
						const base64 = contents.toString('base64');
						img.src = `data:${mime};base64,${base64}`;
					})

					dom.window.document.querySelector("#start").disabled = true;
					dom.window.document.body.appendChild(dom.window.document.createElement('script')).textContent = contentScriptText.replace('__CURRENT_SHA__', '"' + sha + '"');

					dom.window.document.body.appendChild(dom.window.document.createElement('script')).textContent = js;
					dom.window.document.head.appendChild(dom.window.document.createElement('style')).textContent = css;
					fs.writeFileSync('dist/singlefile.html', dom.serialize());
				})
			}
		}
    ]
}).finally(() => {
    console.timeEnd("Single file build")
})