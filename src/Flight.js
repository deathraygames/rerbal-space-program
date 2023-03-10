import { PARTS_LOOKUP } from './parts.js';
import { ATMOSPHERE_HEIGHT, PLANET_RADIUS } from './constants.js';

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

export default Flight;
