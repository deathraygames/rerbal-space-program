import copy from 'rollup-plugin-copy';

const input = './src/game.js';
// External can avoid some warnings but later builds will need to either have these
// dependencies, or pull them in somehow.
const external = [];
const plugins = [
	copy({
		targets: [
			{
				src: './node_modules/roguelike-fonts/AppleII.ttf',
				dest: './static/fonts/',
			}
		],
	}),
];
const watch = {
	exclude: ['node_modules/**'],
};

export default [
	{
		input,
		output: {
			file: './build/game_bundle.js',
			format: 'iife',
		},
		plugins,
		external,
		watch,
	},
];
