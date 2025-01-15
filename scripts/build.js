import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy';
import { lessLoader } from 'esbuild-plugin-less';
import { options as commonOptions, define as commonDefinitions } from './common';

console.time("Production build")

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
        lessLoader()
    ]
}).finally(() => {
    console.timeEnd("Production build")
})