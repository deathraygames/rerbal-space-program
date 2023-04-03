// import { KeyboardCommander } from 'keyboard-commander';
import { KeyboardCommander } from '../node_modules/keyboard-commander/src/index.js'; // eslint-disable-line
// import { PART_KEYS, PARTS_LOOKUP } from './parts.js';
import BUILDINGS from './buildings.js';
// import { PLANET_RADIUS, ATMOSPHERE_HEIGHT,
// ATMOPSHERE_RADIUS, ROCKET_ROWS } from './constants.js';
import states from './states.js';
import Flight from './Flight.js';

class Game {
	constructor() {
		// this.BUILDINGS = ['VAB', 'Research', 'Launch Pad'];
		this.selectedBuildingIndex = 0;
		this.selectedResearchPartIndex = 0;
		this.selectedVabPartIndex = 0; // which part the cursor is at
		this.pickedUpVabPartKey = null; // which part has been "picked up"
		this.selectedVabRocketIndex = 0;
		this.selectedVabTabIndex = 0;
		this.researchPoints = 0;
		this.unlockedPartKeys = ['c', 'p', 'b', 'm', 'f', 'e', 'o'];
		this.rocketDesign = ['p', 'c', 'm', 'b']; // , 'e', 'b'];
		this.stateKey = 'home'; // 'spaceCenter';
		this.turns = 0;
		this.autoAdvanceTimer = 0;
		this.timeMultiplier = 3;
		window.document.addEventListener('DOMContentLoaded', () => {
			this.kbCommander = new KeyboardCommander({}, { command: (c) => this.handleCommand(c) });
			this.switchState(this.stateKey);
			window.document.addEventListener('click', (event) => {
				const commandElt = event.target.closest('[data-command]');
				if (commandElt && commandElt.dataset.command) {
					this.handleCommand(commandElt.dataset.command);
					event.preventDefault();
				}
			});
		});
	}

	getState() {
		return states[this.stateKey];
	}

	startFlight() {
		// if (this.flight) {
		// console.warn('Flight already exists');
		// return;
		// }
		this.flight = new Flight(this.rocketDesign);
		this.flight.setup();
	}

	switchState(newStateKeyParam) {
		// Clear / drop things
		this.pickedUpVabPartKey = null;
		this.stopAutoAdvance();
		// Handle new flights / continuation
		if (
			newStateKeyParam === 'flight'
			|| (newStateKeyParam === 'continue-flight' && !this.flight)) {
			this.startFlight();
		}
		const newStateKey = (newStateKeyParam === 'continue-flight') ? 'flight' : newStateKeyParam;
		// Switch state
		// const lastStateKey = this.stateKey;
		this.stateKey = newStateKey;
		// console.log('Switched from', lastStateKey, 'to', newStateKey);
		this.kbCommander.setMapping(this.getState().keyMapping);
		this.render();
	}

	render() {
		const state = this.getState();
		window.document.querySelector('main').style.display = 'block';
		window.document.querySelectorAll('.page').forEach((pageElt) => {
			const method = (pageElt.id === state.pageId) ? 'remove' : 'add';
			pageElt.classList[method]('hide');
		});
		// TODO: show/hide state pages
		state.render(this);
	}

	selectVabRocket(n) {
		this.selectedVabRocketIndex = Number(n);
		if (!this.pickedUpVabPartKey) return;
		this.rocketDesign[this.selectedVabRocketIndex] = this.pickedUpVabPartKey;
		// TODO: Allow multiple parts per row
		this.pickedUpVabPartKey = null;
	}

	select(what, who) {
		switch (what) {
			case 'building': {
				this.selectedBuildingIndex += Number(who);
				if (this.selectedBuildingIndex < 0) this.selectedBuildingIndex = BUILDINGS.length - 1;
				else if (this.selectedBuildingIndex > BUILDINGS.length - 1) this.selectedBuildingIndex = 0;
				break;
			}
			case 'vabPart': {
				this.pickedUpVabPartKey = (this.pickedUpVabPartKey === who) ? null : who;
				break;
			}
			case 'vabRocket': {
				this.selectVabRocket(Number(who));
				break;
			}
			case 'researchPart': {
				// TODO
				break;
			}
			default: // console.warn(what, who);
		}
		this.render();
	}

	autoAdvance(turns) {
		// this.handleCommand('advance turn');
		if (turns) this.turns = turns;
		this.turns -= 1;
		this.flight.advanceTurn(1);
		const turnWaitTime = 1000 / this.timeMultiplier;
		const iterations = 2;
		const timePerIteration = 1 / iterations;
		const timeWaitTime = turnWaitTime / (iterations + 1); // 1= wiggle room
		// ^ based on how many times we advance time and how much much computing wiggle room we leave
		this.flight.advanceTime(timePerIteration);
		this.render();
		setTimeout(() => {
			this.flight.advanceTime(timePerIteration);
			this.render();
			// setTimeout(() => {
			// this.flight.advanceTime(timePerIteration);
			// this.render();
			// }, timeWaitTime);
		}, timeWaitTime);
		// Do we have turns left to run through?
		if (this.turns > 0) {
			this.autoAdvanceTimer = window.setTimeout(() => this.autoAdvance(), turnWaitTime);
		}
	}

	stopAutoAdvance() {
		this.turns = 0;
		window.clearTimeout(this.autoAdvanceTimer);
		this.autoAdvanceTimer = 0;
	}

	toggleAutoAdvance() {
		if (this.autoAdvanceTimer) this.stopAutoAdvance();
		else this.autoAdvance(Infinity);
	}

	handleCommand(command) {
		// console.log(command);
		const commandWords = command.split(' ');
		const verb = commandWords[0];
		if (command === 'activate stage') {
			if (this.flight) {
				this.flight.activateNextStage();
			}
		}
		if (verb === 'autoAdvance') {
			if (this.flight) {
				if (commandWords[1] === 'on') this.autoAdvance(Infinity);
				if (commandWords[1] === 'off') this.stopAutoAdvance();
				if (commandWords[1] === 'toggle') this.toggleAutoAdvance();
			}
		}
		if (command === 'advance turn') {
			if (this.flight) {
				this.turns += 1;
				this.autoAdvance();
			}
		}
		if (command === 'clear vab') {
			this.rocketDesign = [];
		}
		if (verb === 'steer') {
			if (this.flight) {
				this.flight.steer((commandWords[1] === 'left') ? -1 : 1);
			}
		}
		if (verb === 'goto') {
			let where = commandWords[1];
			if (where === 'selected-building') where = BUILDINGS[this.selectedBuildingIndex].goto;
			this.switchState(where);
			return;
		}
		if (verb === 'select') {
			this.select(commandWords[1], commandWords[2]);
			return;
		}
		if (verb === 'zoom') {
			if (this.flight) {
				if (commandWords[1] === 'in') this.flight.zoomIn();
				else if (commandWords[1] === 'out') this.flight.zoomOut();
			}
		}
		this.render();
	}
}

const game = new Game();
window.game = game;
