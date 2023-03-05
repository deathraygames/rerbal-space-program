(function () {
	'use strict';

	class Observer {
		constructor() {
			this.eventListeners = {};
		}

		/** Add event, analogous to `addEventListener` and jQuery's `on` */
		on(eventTypeName, listener) {
			let eventListenerSet = this.eventListeners[eventTypeName];
			if (!eventListenerSet) {
				this.eventListeners[eventTypeName] = new Set();
				eventListenerSet = this.eventListeners[eventTypeName];
			}
			eventListenerSet.add(listener);
		}

		/** Remove event, analogous to `removeEventListener` and jQuery's `off` */
		off(eventTypeName, listener) {
			const eventListenerSet = this.eventListeners[eventTypeName];
			if (!eventListenerSet) return;
			eventListenerSet.delete(listener);
		}

		/** Trigger an event */
		trigger(eventTypeName, data) {
			const eventListenerSet = this.eventListeners[eventTypeName];
			if (!eventListenerSet) return;
			eventListenerSet.forEach((listener) => listener(data));
		}
	}

	// Events
	const COMMAND_EVENT = 'command';
	const MISSING_COMMAND_EVENT = 'missingCommand';
	const MOUNT_EVENT = 'mount';
	const UNMOUNT_EVENT = 'unmount';
	const MAPPING_EVENT = 'mapping';
	const ALL_EVENTS = [
		COMMAND_EVENT, MISSING_COMMAND_EVENT, MOUNT_EVENT, UNMOUNT_EVENT, MAPPING_EVENT,
	];
	// Other constants
	const KEY_EVENT = 'keydown'; // Note that keyPress acts different and doesn't trigger for some keys

	class KeyboardCommander extends Observer {
		constructor(keyCommandMapping = {}, options = {}) {
			super();
			// this.state = options.state || 'default';
			this.mapping = {};
			this.setMapping(keyCommandMapping);
			this.document = options.document || window?.document || null;
			if (!this.document?.addEventListener) throw error('document with addEventListener is required');
			this.keyPressListener = (event) => this.handleKeyPress(event);
			// Set up event hooks, if provided
			this.setupEventListeners(options);
			// Advanced settings
			this.nodeNamesDontTrigger = ['TEXTAREA', 'INPUT'];
			this.nodeNamesAllowDefault = ['TEXTAREA', 'INPUT']; // redundant since they won't get triggered
			// Start it up - default is to automatically mount
			if (options.autoMount === undefined || options.autoMount) this.mount();
		}

		setMapping(mappingParam = {}) {
			if (typeof mappingParam !== 'object') throw new Error('Invalid type for mapping param');
			this.mapping = {...mappingParam};
			this.trigger(MAPPING_EVENT);
			return this.mapping;
		}

		mapKey(key, command) {
			this.mapping[key] = command;
			this.trigger(MAPPING_EVENT);
			return true;
		}

		mapUnmappedKey(key, command) {
			if (this.mapping[key]) return false; // Don't overwrite a mapping
			return this.mapKey(key, command);
		}

		unmapKey(key) {
			if (this.mapping[key]) return false;
			delete this.mapping[key];
			this.trigger(MAPPING_EVENT);
			return true;
		}

		mount() {
			this.document.addEventListener(KEY_EVENT, this.keyPressListener);
			this.trigger(MOUNT_EVENT);
		}

		unmount() {
			this.document.removeEventListener(KEY_EVENT, this.keyPressListener);
			this.trigger(UNMOUNT_EVENT);
		}

		handleKeyPress(event) {
			// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
			const { key, code, keyCode, altKey, ctrlKey, shiftKey, metaKey, repeat } = event;
			const details = { code, keyCode, altKey, ctrlKey, shiftKey, metaKey, repeat };
			const { nodeName } = event.target;
			if (this.nodeNamesDontTrigger.includes(nodeName)) return;
			if (!this.nodeNamesAllowDefault.includes(nodeName)) {
				event.preventDefault();
			}
			this.triggerKey(key, details);
		}

		setupEventListeners(listenersObj = {}) {
			ALL_EVENTS.forEach((eventName) => {
				// Assumes that the value will be a function
				if (listenersObj[eventName]) this.on(eventName, listenersObj[eventName]);
			});
		}

		triggerCommand(command) {
			this.trigger(COMMAND_EVENT, command);
		}

		triggerMissingCommand(key) {
			// console.warn('No command for', key);
			this.trigger(MISSING_COMMAND_EVENT, key);
		}

		triggerKey(key, details = {}) {
			const command = this.mapping[key];
			// TODO: Look at details and handle them in the mapping
			if (command) {
				this.triggerCommand(command);
			} else {
				this.triggerMissingCommand(key);
			}
		}

		getKeysMapped() {
			return Object.keys(this.mapping);
		}

		getCommands() {
			const uniqueCommands = new Set();
			this.getKeysMapped().forEach((key) => uniqueCommands.add(this.mapping[key]));
			return Array.from(uniqueCommands);
		}
	}

	// import { KeyboardCommander } from 'keyboard-commander';

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
	new KeyboardCommander(mapping, { command: handleCommand });

})();
