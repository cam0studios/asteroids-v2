import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy';
import { lessLoader } from 'esbuild-plugin-less';
import common from './common';

console.time("Production build")

esbuild.build({
    ...common,
    minify: true,
    define: {
        '__IS_DEVELOPMENT__': 'false',
    },
    plugins: [
        copy({
            resolveFrom: 'cwd',
            assets: {
                from: ['./public/**/*'],
                to: ['./dist']
            }
        }),
        lessLoader()
    ]
}).finally(() => {
    console.timeEnd("Production build")
})