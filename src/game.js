// import { KeyboardCommander } from 'keyboard-commander';
import { KeyboardCommander } from '../node_modules/keyboard-commander/src/index.js';

const mapping = {
	w: 'wear/wield',
	e: 'eat',
	r: 'read',
	Tab: 'next target',
	Enter: 'action',
};
const handleCommand = (command) => {
	console.log(command);
};
const kbCommander = new KeyboardCommander(mapping, { command: handleCommand });
window.kbCommander = kbCommander;
