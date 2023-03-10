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

export {
	PARTS,
	PART_KEYS,
	PARTS_LOOKUP,
};
