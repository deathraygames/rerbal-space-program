import { PARTS, PART_KEYS, PARTS_LOOKUP } from './parts.js';
import BUILDINGS from './buildings.js';
import { PLANET_RADIUS, ATMOPSHERE_RADIUS, ROCKET_ROWS } from './constants.js';

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
							- ${building.name} - ${building.description}
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

export default states;
