import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy';
import { lessLoader } from 'esbuild-plugin-less';
import { options as commonOptions, define as commonDefinitions } from './common';
import jsdom from 'jsdom';
import fs from 'fs';

console.time("Single file build")

esbuild.build({
    ...commonOptions,
    minify: true,
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
					const js = fs.readFileSync("dist/main.js", 'utf-8');
					const css = fs.readFileSync("dist/main.css", 'utf-8');
					const html = fs.readFileSync('dist/index.html', 'utf-8');
					const dom = new jsdom.JSDOM(html);
					dom.window.document.head.querySelector("link[href='main.css']").remove();
					dom.window.document.head.querySelector("script[src='main.js']").remove();

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