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

	var BUILDINGS = [
		{ name: 'VAB', goto: 'vab', description: 'Create rockets at the Vehicle Assembly Building', key: 'v' },
		// { name: 'Research Center', goto: 'research',
		// description: 'Unlock new parts using science', key: 'r' },
		{ name: 'Research Center', goto: 'research', description: 'Review details of each part', key: 'r' },
		{ name: 'Launch Pad', goto: 'flight', description: 'Start a new flight with current rocket', key: 'l' },
		{ name: 'Tracking Station', goto: 'continue-flight', description: 'Continue existing flight', key: 't' },
		// { name: 'Rerbonaut Complex', goto: '', description: '', key: 'a' },
		// { name: 'Mission Control', goto: '', description: '', key: 'a' },
		// { name: 'Administration Center', goto: '', description: '', key: 'a' },
	];

	const TOP_BOTTOM_CONNECTORS = [1, 0, 1, 0];
	const BOTTOM_CONNECTOR = [0, 0, 1, 0];
	const TOP_CONNECTOR = [1, 0, 0, 0];
	const SIDE_CONNECTORS = [0, 1, 0, 1];

	const PARTS = [
		{
			key: 'c',
			name: 'Mk2 Command Capsule',
			scienceCost: 0,
			connectors: TOP_BOTTOM_CONNECTORS,
			mass: 2,
			steering: 3,
			control: 15,
			complexity: 4,
			polygonPoints: [15, 0, 25, 0, 25, 10, 40, 36, 40, 40, 0, 40, 0, 36, 15, 10],
		},
		{
			key: 'o',
			name: 'Computotron',
			scienceCost: 0,
			connectors: TOP_BOTTOM_CONNECTORS,
			mass: 1,
			steering: 0,
			control: 10,
			complexity: 4,
			polygonPoints: [0, 0, 38, 0, 38, 20, 0, 20],
		},
		{
			key: 'p',
			name: 'Mk17 Parachute (Cosmetic)',
			scienceCost: 0,
			connectors: BOTTOM_CONNECTOR,
			mass: 1,
			complexity: 2,
			polygonPoints: [10, 0, 20, 20, 0, 20],
		},
		{
			key: 'b',
			name: 'RT-6 Solid Fuel Booster',
			scienceCost: 0,
			connectors: TOP_CONNECTOR,
			mass: 4,
			dryMass: 2,
			thrust: 230,
			fuel: 180,
			complexity: 2,
			polygonPoints: [
				0, 40, 0, 0, 40, 0, 40, 40, // main body
				30, 40, 30, 50, // bottom square right
				25, 50, 35, 60,
				5, 60, 15, 50,
				10, 50, 10, 40, // bottom square left
			],
		},
		{
			key: 'm',
			name: 'Goo Demystifier Unit (Cosmetic)',
			scienceCost: 0,
			connectors: SIDE_CONNECTORS,
			mass: 2,
			complexity: 4,
			polygonPoints: [0, 0, 40, 0, 40, 40, 0, 40],
		},
		{
			key: 'f',
			name: 'Aero Fin',
			scienceCost: 0,
			connectors: SIDE_CONNECTORS,
			mass: 2,
			steering: 6,
			complexity: 2,
			polygonPoints: [
				10, 0, 30, 0,
				30, 6, 40, 28, 30, 26, 30, 30,
				10, 30, 10, 26, 0, 28, 10, 6,
			],
		},
		{
			key: 'e',
			name: 'Separator',
			scienceCost: 0,
			connectors: TOP_BOTTOM_CONNECTORS,
			mass: 1,
			steering: 0,
			separates: true,
			complexity: 2,
			polygonPoints: [
				0, 0, 40, 0,
				38, 10,
				40, 20, 0, 20,
				2, 10],
		},
	].map((part) => {
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		part.polygonPoints.forEach((n, i) => {
			const isOdd = i % 2;
			if (isOdd) { // we're looking a y value
				if (n < minY) minY = n;
				else if (n > maxY) maxY = n;
				return;
			}
			// even is an x value
			if (n < minX) minX = n;
			else if (n > maxX) maxX = n;
		});
		return {
			...part,
			height: maxY - minY,
			width: maxX - minX,
		};
	});
	const PART_KEYS = PARTS.map((part) => part.key);
	const PARTS_LOOKUP = PART_KEYS.reduce((obj, key, i) => ({ ...obj, [key]: PARTS[i] }), {});

	const PLANET_RADIUS = 600000; // 600 km
	const ATMOSPHERE_HEIGHT = 70000; // 70 km
	const ATMOPSHERE_RADIUS = PLANET_RADIUS + ATMOSPHERE_HEIGHT;
	const ROCKET_ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	const VIEW_HEIGHT_OFFSET = -5000;

	function $(selector) {
		return window.document.querySelector(selector);
	}

	const researchPartsKeyMapping = PART_KEYS.reduce(
		(obj, key) => ({ ...obj, key: `select researchPart ${key}` }),
		{},
	);
	const vabPartsKeyMapping = PART_KEYS.reduce(
		(obj, key) => ({ ...obj, [key]: `select vabPart ${key}` }),
		{},
	);
	const vabRocketKeyMapping = ROCKET_ROWS.reduce(
		(obj, n) => ({ ...obj, [n]: `select vabRocket ${n}` }),
		{},
	);

	function getRocketPolygonsHtml(rocket = [], classes = []) {
		let y = 0;
		return rocket.map((r, i) => {
			if (!r) {
				y += 40;
				return '';
			}
			// "r" is either a string part key, or an object
			const rocketItem = (typeof r === 'object') ? r : { key: r };
			const part = PARTS_LOOKUP[rocketItem.key];
			const points = part.polygonPoints.join(' ');
			const x = 20 - (part.width / 2);
			const partClass = classes[i] || '';
			let html = (
				`<polygon points="${points}" class="${partClass}"
				style="transform: translate(${x}px, ${y}px);" />
			<text x="${x - 25}" y="${y + 18}">${i}</text>`
			);
			if (rocketItem.fuel) {
				// Progress pie
				const percent = rocketItem.fuel / part.fuel;
				const fuelRadius = 10;
				const circumference = fuelRadius * (2 * Math.PI);
				const dashArray = [percent * circumference, circumference - percent];
				html += (
					`<text x="${x - 25}" y="${y + 31}" class="flight-fuel-text">${rocketItem.fuel}</text>
				<circle cx="${x + 20}" cy="${y + 20}" r="${fuelRadius}" class="flight-fuel-pie-bg" />
				<circle cx="${x + 20}" cy="${y + 20}" r="${fuelRadius}" class="flight-fuel-pie"
					stroke-dasharray="${dashArray.join(' ')}" />`
				);
			}
			y += part.height;
			return html;
		}).join('');
	}

	function setDimensionsToMatchContainer(svgElement, containerElement) {
		const { style } = svgElement;
		style.display = 'none';
		// svgElement.setAttribute('height', containerElement.scrollHeight);
		// svgElement.setAttribute('width', containerElement.scrollWidth);
		const ratio = containerElement.scrollHeight / containerElement.scrollWidth;
		style.display = 'block';
		return {
			ratio,
			height: containerElement.scrollHeight,
			width: containerElement.scrollWidth,
		};
	}

	function setViewBox(svgElement, x, y) {
		const viewBox = [0, 0, x, y];
		svgElement.setAttribute('viewBox', viewBox.join(' '));
		return viewBox;
	}

	const states = {
		home: {
			pageId: 'home-page',
			keyMapping: {
				Enter: 'goto spaceCenter',
				//
			},
			render() {},
		},
		spaceCenter: {
			pageId: 'space-center-page',
			keyMapping: {
				Enter: 'goto selected-building',
				w: 'select building -1',
				s: 'select building +1',
				ArrowUp: 'select building -1',
				ArrowDown: 'select building +1',
				v: 'goto vab',
				r: 'goto research',
				l: 'goto flight',
				Escape: 'goto home',
			},
			render({ selectedBuildingIndex, researchPoints } = {}) {
				$('.researchPoints').innerText = researchPoints;
				$('#building-list').innerHTML = (
					BUILDINGS.map((building, i) => {
						const classes = ['building'];
						if (selectedBuildingIndex === i) classes.push('building-selected');
						return (
							`<li class="${classes.join(' ')}" data-command="goto ${building.goto}">
							[<span class="key">${building.key}</span>]
							<span class="building-name">${building.name}</span> - ${building.description}
						</li>`
						);
					}).join('')
				);
			},
		},
		research: {
			pageId: 'research-page',
			keyMapping: {
				Escape: 'goto spaceCenter',
				Enter: 'goto spaceCenter',
				Space: 'unlock selected-research-part',
				...researchPartsKeyMapping,
			},
			render({ selectedResearchPartIndex, unlockedPartKeys, researchPoints }) {
				$('.researchPoints').innerText = researchPoints;
				$('#research-parts-list').innerHTML = (
					PARTS.map((part, i) => {
						const classes = ['research-part'];
						const unlocked = unlockedPartKeys.includes(part.key);
						const {
							mass = 0,
							dryMass = 0,
							steering = 0,
							control = 0,
							// complexity = 0,
							thrust = 0,
							fuel = 0,
						} = part;
						const details = { mass, dryMass, steering, control, thrust, fuel };
						if (selectedResearchPartIndex === i) classes.push('research-part-selected');
						return (
							`<div class="${classes.join(' ')}">
							<dt>
								[<span class="${(!unlocked) ? 'key' : ''}">${part.key}</span>]
								${part.name}
							</dt>
							<dd>
								${(unlocked) ? 'Unlocked / Researched' : 'Locked'}<br />
								${JSON.stringify(details, null, ' ')}
							</dd>
						</div>`
						);
					}).join('')
				);
			},
		},
		vab: {
			pageId: 'vab-page',
			keyMapping: {
				Escape: 'goto spaceCenter',
				Enter: 'goto flight',
				Backspace: 'clear vab',
				...vabPartsKeyMapping,
				...vabRocketKeyMapping,
			},
			render({ selectedVabPartIndex, pickedUpVabPartKey, unlockedPartKeys, rocketDesign }) {
				const unlockedParts = PARTS.filter((part) => unlockedPartKeys.includes(part.key));
				$('#vab-parts-list').innerHTML = (
					unlockedParts.map((part, i) => {
						const classes = ['vab-part'];
						const unlocked = unlockedPartKeys.includes(part.key);
						if (!unlocked) classes.push('vab-part-locked');
						if (selectedVabPartIndex === i) classes.push('vab-part-selected');
						if (pickedUpVabPartKey === part.key) classes.push('vab-part-picked-up');
						return (
							`<li class="${classes.join(' ')}" data-command="select vabPart ${part.key}">
							[<span class="${(unlocked) ? 'key' : ''}">${part.key}</span>]
							${part.name}
						</li>`
						);
					}).join('')
				);
				$('#vab-rocket-list').innerHTML = (
					ROCKET_ROWS.map((n) => {
						const rocketRow = rocketDesign[n];
						return (
							`<li class="rocket-row" data-command="select vabRocket ${n}">
							[<span class="key">${n}</span>]
							${rocketRow || ''}
						</li>`
						);
					}).join('')
				);
				$('#vab-rocket-svg-group').innerHTML = getRocketPolygonsHtml(rocketDesign);
				// Calculate totals
				let totalMass = 0;
				// let complexity = 0;
				let steering = 0;
				let control = 0;
				rocketDesign.forEach((partKey) => {
					const part = PARTS_LOOKUP[partKey];
					totalMass += part.mass || 0;
					// complexity += part.complexity || 0;
					steering += part.steering || 0;
					control += part.control || 0;
				});
				// Display rocket into
				$('#vab-rocket-mass-value').innerText = totalMass;
				// $('#vab-rocket-complexity-value').innerText = complexity;
				$('#vab-rocket-steering-value').innerText = steering;
				$('#vab-rocket-control-value').innerText = control + (control < 10 ? ' (!!!)' : '');
			},
		},
		flight: {
			pageId: 'flight-page',
			keyMapping: {
				'-': 'zoom out',
				_: 'zoom out',
				'+': 'zoom in',
				'=': 'zoom in',
				a: 'steer left',
				d: 'steer right',
				Enter: 'advance turn',
				Escape: 'goto spaceCenter',
				' ': 'activate stage',
				Tab: 'autoAdvance toggle',
			},
			render({ flight }) {
				const {
					zoom, rocket, position, rotation, path, maxPath, time, computed,
					control, steering, destroyed,
					// throttle, velocity,
				} = flight;
				$('#flight-time-value').innerText = Math.round(time);
				$('#flight-altitude-value').innerText = Math.round(computed.altitude);
				{
					const rocketContainer = $('#flight-rocket');
					const rocketSvg = $('#flight-rocket-svg');
					const rocketSvgGroup = $('#flight-rocket-svg-group');
					const { ratio } = setDimensionsToMatchContainer(rocketSvg, rocketContainer);
					const rocketClasses = rocket.map((rocketItem) => ((rocketItem && rocketItem.active) ? 'part-active' : ''));
					rocketSvgGroup.innerHTML = getRocketPolygonsHtml(rocket, rocketClasses);
					const viewBoxWidth = 160;
					const viewBoxHeight = viewBoxWidth * ratio;
					const offsetX = viewBoxWidth / 2;
					const offsetY = 0;
					rocketSvgGroup.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(0deg)`;
					setViewBox(rocketSvg, viewBoxWidth, viewBoxHeight);
				}
				{
					const mapContainer = $('#flight-map-container');
					const mapSvg = $('#flight-map-svg');
					const { ratio } = setDimensionsToMatchContainer(mapSvg, mapContainer);
					// mapSvg.style.display = 'none';
					// mapSvg.setAttribute('height', mapContainer.scrollHeight);
					// mapSvg.setAttribute('width', mapContainer.scrollWidth);
					// const sizeRatio = mapContainer.scrollHeight / mapContainer.scrollWidth;
					const viewBoxHeight = Math.round(PLANET_RADIUS * (1 / zoom)); // ATMOSPHERE_HEIGHT * 1.2;
					const viewBoxWidth = Math.round(viewBoxHeight * ratio);
					setViewBox(mapSvg, viewBoxWidth, viewBoxHeight);

					$('#planet-circle').setAttribute('r', PLANET_RADIUS);
					$('#atmosphere-circle').setAttribute('r', ATMOPSHERE_RADIUS);
					const offsetX = viewBoxWidth / 2;
					const y = position[0] + VIEW_HEIGHT_OFFSET; // PLANET_RADIUS;
					const offsetY = y + (viewBoxHeight / 2);
					const deg = (computed.planetDegrees * -1) - 90;
					$('#flight-map-world-group').style.transform = (
						`translate(${offsetX}px, ${offsetY}px) rotate(${deg}deg)`
					);
				}
				{
					const [x, y] = position;
					const mapRocket = $('#flight-map-rocket-dot');
					$('#flight-map-rocket-group').style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
					mapRocket.setAttribute('r', 1000);
				}
				// Nav ball
				$('#navball-group').style.transform = `rotate(${rotation}deg)`;
				$('#navball-velocity-arrow').style.transform = `rotate(${computed.velocityDegrees}deg)`;
				// Flight path and trajectory
				$('#flight-map-path-group').innerHTML = (
					path.map(([x, y], i) => {
						const op = i / maxPath;
						return `<circle cx="${x}" cy="${y}" r="500" style="opacity: ${op};" class="path-circle" />`;
					}).join('')
				);
				$('#flight-map-trajectory-group').innerHTML = (
					computed.trajectory.map(([x, y]) => {
						const op = 1; // i / maxPath;
						return `<circle cx="${x}" cy="${y}" r="300" style="opacity: ${op};" class="trajectory-circle" />`;
					}).join('')
				);
				// Info on Right
				$('#flight-control-value').innerText = `${Math.round(control)} / ${computed.maxControl}`;
				$('#flight-steering-value').innerText = `${Math.round(steering)} / ${computed.maxSteering}`;
				$('#flight-speed-value').innerText = Math.round(computed.speed);
				$('#flight-rotation-value').innerText = Math.round(rotation * 10) / 10;
				$('#flight-rocket-mass-value').innerText = Math.round(computed.mass * 10) / 10;
				$('#flight-rocket-total-fuel-value').innerText = Math.round(computed.totalFuel);
				// $('#flight-info-dump').innerText = JSON.stringify({
				// position,
				// throttle,
				// velocity,
				// velocityDegrees: computed.velocityDegrees,
				// });
				$('#flight-destroyed').style.display = destroyed ? 'block' : 'none';
			},
		},
		recap: {
			pageId: 'recap-page',
			keyMapping: {
				Escape: 'goto spaceCenter',
				Enter: 'goto spaceCenter',
			},
			render() {},
		},
		orbit: {
			pageId: 'orbit-page',
			keyMapping: {
				Escape: 'goto spaceCenter',
				Enter: 'goto spaceCenter',
			},
			render() {},
		},
	};

	const STAGE_CONTROL_COST = 10;
	const DEG_PER_RADIAN = (180 / Math.PI);
	const LAUNCH_BUFFER = 0;
	const STEER_MULTIPLIER = 3;

	class Flight {
		constructor(rocketDesign = []) {
			this.rocketDesign = [...rocketDesign];
			// current rocket consists of an array of objects that contain:
			// a part key, fuel, active status
			this.rocket = rocketDesign.map((key, index) => {
				if (!key) return null;
				const fuel = PARTS_LOOKUP[key].fuel || 0;
				return { index, key, fuel, active: 0 };
			});
			this.path = [];
			this.maxPath = 100;
			this.time = 0;
			this.position = [PLANET_RADIUS + LAUNCH_BUFFER, 0];
			this.rotation = 0;
			this.throttle = 0;
			this.velocity = [0, 0];
			this.zoom = 5; // was 21
			this.control = 0;
			this.steering = 0;
			this.destroyed = false;
			this.isClone = false;
			// Computed values
			this.computed = {
				altitude: 0,
				planetTheta: 0,
				planetDegrees: 0,
				maxSteering: 0,
				speed: 0,
				velocityDegrees: 0,
				mass: 1,
				maxControl: 0,
				totalFuel: 0,
				trajectory: [],
				// apoapsis:
				// periapsis:
			};
		}

		setup() {
			this.compute();
			this.control = this.computed.maxControl;
		}

		clone() {
			const flightClone = new Flight();
			Object.keys(this).forEach((propName) => {
				if (propName === 'computed') return;
				if (typeof this[propName] === 'number') {
					flightClone[propName] = this[propName];
					return;
				}
				// console.log('clone', propName, this[propName]);
				flightClone[propName] = JSON.parse(JSON.stringify(this[propName]));
			});
			flightClone.isClone = true;
			return flightClone;
		}

		steer(amount) {
			if (Math.abs(this.steering) >= this.computed.maxSteering) return;
			if (this.control <= 0) return;
			const dir = amount / Math.abs(amount);
			const quantity = Math.min(this.control, Math.abs(amount));
			this.control -= quantity;
			this.steering += (quantity * dir);
		}

		zoomIn() {
			if (this.zoom < 1) this.zoom += 0.1;
			else this.zoom += 1;
			if (this.zoom > 30) this.zoom = 30;
		}

		zoomOut() {
			if (this.zoom > 1) this.zoom -= 1;
			else { this.zoom -= 0.1; }
			if (this.zoom < 0.1) this.zoom = 0.1;
		}

		static radiansToDegrees(radians) {
			// return (radians * DEG_PER_RADIAN) - 90;
			return (radians * DEG_PER_RADIAN);
		}

		static degreesToRadians(deg) {
			// return (deg + 90) / DEG_PER_RADIAN;
			return deg / DEG_PER_RADIAN;
		}

		static cartesianToPolar([x = 0, y = 0]) {
			const r = Math.sqrt(x * x + y * y);
			const radians = Flight.cartesianToRadians([x, y]);
			const degrees = Flight.radiansToDegrees(radians);
			return { r, radians, theta: radians, degrees };
		}

		static polarToCartesian(r, radians) {
			const x = r * Math.cos(radians);
			const y = r * Math.sin(radians);
			return [x, y];
		}

		static cartesianToRadians([x = 0, y = 0]) {
			return Math.atan2(y, x);
		}

		static cartesianToDegrees([x = 0, y = 0]) {
			return Flight.radiansToDegrees(Flight.cartesianToRadians([x, y]));
		}

		calcSpeed() {
			this.computed.speed = Math.sqrt(this.velocity[0] ** 2 + this.velocity[1] ** 2);
			return this.computed.speed;
		}

		calcAltitude() {
			const { r } = Flight.cartesianToPolar(this.position);
			this.computed.altitude = r - PLANET_RADIUS;
			return this.computed.altitude;
		}

		calcMass() {
			const mass = this.rocket.reduce((sum, rocketItem) => {
				if (!rocketItem) return sum;
				const part = PARTS_LOOKUP[rocketItem.key];
				const fullMass = part.mass || 0;
				const dryMass = part.dryMass || fullMass;
				const wetMass = (!part.fuel) ? 0 : (
					(rocketItem.fuel / part.fuel) * (fullMass - dryMass)
				);
				return sum + dryMass + wetMass;
			}, 0);
			this.computed.mass = Math.max(mass, 0.1);
			return this.computed.mass;
		}

		compute() {
			const { r, theta } = Flight.cartesianToPolar(this.position);
			this.computed.altitude = r - PLANET_RADIUS;
			this.computed.planetTheta = theta;
			this.computed.planetDegrees = Flight.radiansToDegrees(theta);
			this.computed.maxSteering = this.rocket.reduce((sum, rocketItem) => {
				if (!rocketItem) return sum;
				return sum + (PARTS_LOOKUP[rocketItem.key].steering || 0);
			}, 0);
			this.computed.maxControl = this.rocket.reduce((sum, rocketItem) => {
				if (!rocketItem) return sum;
				return sum + (PARTS_LOOKUP[rocketItem.key].control || 0);
			}, 0);
			this.computed.totalFuel = this.rocket.reduce((sum, rocketItem) => {
				if (!rocketItem) return sum;
				return sum + (rocketItem.fuel || 0);
			}, 0);
			this.computed.speed = this.calcSpeed();
			this.computed.velocityDegrees = Flight.cartesianToDegrees(this.velocity);
			this.computed.mass = this.calcMass();
			return this.computed;
		}

		computeTrajectory() {
			if (this.isClone) return;
			const sim = this.clone();
			this.computed.trajectory = [];
			for (let i = 0; i < 15; i += 1) {
				sim.advanceTime(8, 0);
				this.computed.trajectory.push([...sim.position]);
			}
		}

		findNextStage() {
			for (let i = this.rocket.length - 1; i >= 0; i -= 1) {
				const rocketItem = this.rocket[i];
				if (!rocketItem) continue; // eslint-disable-line no-continue
				if (!rocketItem.key) continue; // eslint-disable-line no-continue
				const part = PARTS_LOOKUP[rocketItem.key];
				if (part && part.thrust && rocketItem.fuel > 0) {
					// We found a booster
					return rocketItem;
				}
				if (part && part.separates) {
					return rocketItem;
				}
				// TODO: find science
			}
			return null;
		}

		findActiveRocketItems() {
			return this.rocket.filter((rocketItem) => rocketItem && rocketItem.active);
		}

		activateNextStage() {
			if (this.control < STAGE_CONTROL_COST) return false;
			const nextStagerocketItem = this.findNextStage();
			if (!nextStagerocketItem) return false;
			this.control -= STAGE_CONTROL_COST;
			nextStagerocketItem.active = 1;
			return true;
		}

		static burnRocketItemFuel(rocketItem, desiredAmount) {
			const amount = Math.min(rocketItem.fuel, desiredAmount);
			rocketItem.fuel -= amount; // eslint-disable-line no-param-reassign
			return { amount, percent: amount / desiredAmount };
		}

		advanceTurn(t = 1) {
			const activeRocketItems = this.findActiveRocketItems();
			// Do separation
			const separatingRocketItems = activeRocketItems.filter(
				(rocketItem) => PARTS_LOOKUP[rocketItem.key].separates,
			);
			if (separatingRocketItems.length) {
				// separate off just the last one so one at a time is removed
				this.separate(separatingRocketItems[separatingRocketItems.length - 1]);
			}
			this.compute();
			// Steer
			const steerAmount = this.steering * t;
			// TODO: cap this at the steering value so we don't over-steer if t > 1
			this.rotation += steerAmount * STEER_MULTIPLIER;
			this.steering = 0;
			this.control = Math.min(this.computed.maxControl, this.control + 1);
		}

		advanceTime(t = 1, wind = 1) {
			this.time += t;
			if (this.time % 2 === 0) {
				this.path.push([...this.position]);
				if (this.path.length > this.maxPath) this.path.shift();
				this.computeTrajectory();
			}
			// Set acceleration based on rotation and thrust
			const thrustingRocketItems = this.findActiveRocketItems().filter((rocketItem) => (
				(rocketItem.fuel > 0) && PARTS_LOOKUP[rocketItem.key].thrust
			));
			const thrust = thrustingRocketItems.reduce((sum, rocketItem) => {
				const part = PARTS_LOOKUP[rocketItem.key];
				const desiredFuelToBurn = 5 * t;
				const { percent } = Flight.burnRocketItemFuel(rocketItem, desiredFuelToBurn);
				// TODO: Remove fuel elsewhere?
				return sum + ((part.thrust || 0) * percent);
			}, 0);
			const rotationRadians = Flight.degreesToRadians(this.rotation);
			const thrustX = Math.cos(rotationRadians) * thrust;
			const thrustY = Math.sin(rotationRadians) * thrust;
			const mass = this.calcMass();
			const acc = [thrustX / mass, thrustY / mass];
			this.applyWind(t * wind);
			this.physics(t, acc, mass);
			this.compute();
		}

		applyWind(t = 1) {
			const { altitude } = this.compute();
			if (altitude > ATMOSPHERE_HEIGHT) return; // No wind in space
			const c = (altitude / (ATMOSPHERE_HEIGHT / 2)) * (Math.PI / 2);
			const windStrength = Math.sin(c) * 12 * t;
			// console.log(windStrength);
			this.rotation += (Math.random() * windStrength) - (Math.random() * windStrength);
		}

		physics(t, [accX, accY], mass) {
			{
				const altitude = this.calcAltitude();
				if (altitude > 0) {
					// Apply acceleration due to gravity
					const gravRadians = this.computed.planetTheta;
					const gravAccX = Math.cos(gravRadians) * -9.8;
					const gravAccY = Math.sin(gravRadians) * -9.8;
					this.velocity[0] += (gravAccX * t);
					this.velocity[1] += (gravAccY * t);
					// Apply wind drag
					if (altitude <= ATMOSPHERE_HEIGHT) {
						const dirVel = [this.velocity[0] > 0 ? 1 : -1, this.velocity[1] > 0 ? 1 : -1];
						// Formula based on https://wiki.kerbalspaceprogram.com/wiki/Atmosphere (Drag)
						const density = altitude / ATMOSPHERE_HEIGHT;
						const coefficientOfDrag = 1 / 4000;
						// ^ just made from playing around - Currently the wind resistance is
						// intentionally not challenging
						const crossSectionalArea = 1; // TODO: calculate this based on direction of ship and size
						const dragForceWithoutVel = 0.5 * density * coefficientOfDrag * crossSectionalArea;
						const dragForceX = (this.velocity[0] ** 2) * dragForceWithoutVel * -dirVel[0];
						const dragForceY = (this.velocity[1] ** 2) * dragForceWithoutVel * -dirVel[1];
						const dragAcc = [dragForceX / mass, dragForceY / mass];
						// if (!this.isClone) console.log(dragAcc);
						this.velocity[0] += (dragAcc[0] * t);
						this.velocity[1] += (dragAcc[1] * t);
					}
				}
			}
			// Apply external/thrust acceleration
			this.velocity[0] += (accX * t);
			this.velocity[1] += (accY * t);
			this.position[0] += (this.velocity[0] * t);
			this.position[1] += (this.velocity[1] * t);
			const { altitude, planetTheta } = this.compute();
			if (altitude < 0) {
				const speed = this.calcSpeed();
				if (speed > 50) this.destroy();
				// Move to top of ground and bounce
				const [x, y] = Flight.polarToCartesian(PLANET_RADIUS, planetTheta);
				this.position[0] = x;
				this.position[1] = y;
				this.velocity[0] *= 0.9; // friction
				this.velocity[1] *= -0.6; // bounce
				this.compute();
			}
		}

		removePart(index) {
			this.rocket[index] = null;
		}

		separate(rocketItem) {
			for (let i = this.rocket.length; i >= rocketItem.index; i -= 1) {
				this.removePart(i);
			}
		}

		destroy() {
			this.rocket.forEach((rocketItem, i) => {
				if (!rocketItem) return;
				if (Math.random() < 0.7) this.removePart(i);
			});
			this.destroyed = true;
		}
	}

	// import { KeyboardCommander } from 'keyboard-commander';

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

})();
