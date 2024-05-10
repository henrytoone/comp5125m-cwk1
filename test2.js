const Reset = "\x1b[0m"
const FgGreen = "\x1b[32m"
const FgRed = "\x1b[31m"
let m;

function findClosestCars2(passengers, cars) {
	const tempMappings = {};
	for (let i = 0; i < passengers.length; i++) {
		tempMappings[passengers[i].id] = [];
	}

	// Assign passengers to the closest available car time-wise that has capacity
	for (let i = 0; i < passengers.length; i++) {
		const passenger = passengers[i];
		let differences = [];
		for (let j = 0; j < cars.length; j++) {
			const car = cars[j];
			if (car.capacity === 0) continue;
			const diff = Math.abs(car.departureTime - passenger.preferredTime);
			differences.push({ id: car.id, diff })
		}
		differences.sort((a, b) => a.diff - b.diff);
		tempMappings[passenger.id].push(...differences)
	}

	return tempMappings
}

// Locate passengers with a first choice that nobody else has
function findUnique(mappings) {
	const unique = [];
	for (let i = 0; i < Object.keys(mappings).length; i++) {
		const passengerId = Object.keys(mappings)[i];
		if (mappings[passengerId].length === 0) continue;
		// console.log(mappings[passengerId].length);
		const firstChoice = mappings[passengerId][0];
		let uniqueChoice = true;
		for (let j = 0; j < Object.keys(mappings).length; j++) {
			if (i === j) continue;
			const passengerId2 = Object.keys(mappings)[j];
			if (firstChoice.id === mappings[passengerId2][0].id) {
				// move to next outer passenger
				uniqueChoice = false;
				break;
			}
		}
		if (!uniqueChoice) continue;
		unique.push({ passengerId, carId: firstChoice.id })
	}
	return unique;
}

function findLowestDiff(mappings) {
	let lowestDiff = Infinity;
	let lowestId = null;
	const passengers = [];
	for (let i = 0; i < Object.keys(mappings).length; i++) {
		const passengerId = Object.keys(mappings)[i];
		const firstChoice = mappings[passengerId][0];
		if (firstChoice.diff < lowestDiff) {
			lowestDiff = firstChoice.diff;
			lowestId = firstChoice.id;
			passengers.length = 0
			passengers.push(passengerId)
		} else if (firstChoice.diff === lowestDiff && lowestId === firstChoice.id) {
			passengers.push(passengerId)
		}
	}

	return { lowestDiff, lowestId, passengers };
}

function removeCarFromMappings(mappings, carId) {
	for (let i = 0; i < Object.keys(mappings).length; i++) {
		const passengerId = Object.keys(mappings)[i];
		mappings[passengerId] = mappings[passengerId].filter((car) => car.id !== carId)
	}
}

function nextHighestDiff(mappings, passengerIds, offset = 0) {
	let highestDiff = -Infinity;
	let highestId = null;
	for (let i = 0; i < passengerIds.length; i++) {
		const passengerId = passengerIds[i];
		// if (mappings[passengerId].length <= offset + 1) return passengerId;
		let nthChoice;
		if (mappings[passengerId].length <= offset + 1) {
			nthChoice = mappings[passengerId][offset];
		}
		else {
			nthChoice = mappings[passengerId][offset + 1];

		}

		if (nthChoice.diff > highestDiff || mappings[passengerId].length <= offset + 1) {
			highestDiff = nthChoice.diff;
			highestId = passengerId;
		}
	}
	return highestId;
}

function findPassengerWithWorstAlternatives(
	closestMapping,
	passengerIds,
	offset = 0
) {
	const possibleWorst = [];
	let worstDiff = -Infinity;
	for (let i = 0; i < passengerIds.length; i++) {
		const passengerId = passengerIds[i];
		if (closestMapping[passengerId].length <= offset + 1) {
			// no alternatives
			possibleWorst.push(passengerId);
			worstDiff = Infinity;
			continue;
		}
		const diff = closestMapping[passengerId][offset + 1].diff;
		if (diff > worstDiff) {
			worstDiff = diff;
			possibleWorst.length = 0;
			possibleWorst.push(passengerId);
		} else if (diff === worstDiff) possibleWorst.push(passengerId);
	}

	console.log("========");
	console.log(possibleWorst);
	console.log(worstDiff);
	console.log(offset);

	// return "EARLY";
	if (possibleWorst.length === 0) throw Error("Somehow no passengers have alternatives");
	if (possibleWorst.length === 1 || worstDiff === -Infinity) return possibleWorst[0];
	return findPassengerWithWorstAlternatives(closestMapping, possibleWorst, offset + 1);
}

function assignPassengers8(passengers, cars) {
	const finalMappings = {};
	for (let i = 0; i < cars.length; i++) {
		finalMappings[cars[i].id] = [];
	}

	const closest = findClosestCars2(passengers, cars)
	// console.log(closest)

	// Assign any cars with exact matches
	while (cars.some((car) => car.capacity > 0) && Object.keys(closest).length > 0) {
		// console.log(closest)
		const uniques = findUnique(closest);
		// console.log(`Uniques: ${!!uniques.length}`)
		if (!uniques.length) {
			// find lowest diff
			const currentMinDiff = Math.min(...Object.values(closest).map((choices) => choices[0].diff));
			const currentMinDiffId = Object.values(closest).find((choices) => choices[0].diff === currentMinDiff)[0].id;
			// console.log(currentMinDiff, currentMinDiffId)
			const nextTarget = {}
			Object.keys(closest).forEach((passengerId) => {
				const choices = closest[passengerId];
				// is this mean to be checking against the closest car (currentMinDiff) but
				// is comparing the diff instead of id?
				if (choices[0].id === currentMinDiffId) {
					nextTarget[passengerId] = choices;
				}
			});
			const { lowestDiff, lowestId, passengers: psngrs } = findLowestDiff(nextTarget);
			// console.log(`${Object.keys(nextTarget)} vs ${psngrs}`)
			// console.log({ lowestDiff, lowestId, psngrs })
			const nextHighestId = nextHighestDiff(closest, m === "A" ? Object.keys(nextTarget) : psngrs);
			// console.log(`next: ${nextHighestId}`)
			finalMappings[lowestId].push(nextHighestId);
			cars.find((car) => car.id === lowestId).capacity--;
			delete closest[nextHighestId]
			if (cars.find((car) => car.id === lowestId).capacity === 0) removeCarFromMappings(closest, lowestId);
			// break;

		} else {
			uniques.forEach(({ carId, passengerId }) => {
				console.log(`${carId} -> ${passengerId}`)
				finalMappings[carId].push(passengerId);
				cars.find((car) => car.id === carId).capacity--;
				delete closest[passengerId]
				if (cars.find((car) => car.id === carId).capacity === 0) removeCarFromMappings(closest, carId);
			});

		}
		// break;
	}
	// console.log(finalMappings)
	// console.log(closest)
	return finalMappings;

}

function test1(alg) {
	const passengers = [
		{ id: "Alice", preferredTime: 6 },
		{ id: "Bob", preferredTime: 10 },
	];

	const cars = [
		{ id: 1, departureTime: 8, capacity: 1 },
		{ id: 2, departureTime: 14, capacity: 1 },
	];

	const expectedDifference = 6;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 1a passed${Reset}`);
	}


	return res;

	// const result = { "output": alg(passengers, cars) }
	// result.total_difference =
	// 	result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)
	// if (result.output[0].passengerId === "Alice"
	// 	&& result.output[0].carId === 1
	// 	&& result.output[1].passengerId === "Bob"
	// 	&& result.output[1].carId === 2) {
	// 	console.log(`${FgGreen}Test 1a passed${Reset}`);
	// }
	// else {
	// 	console.error(`${FgRed}Test failed - 1a${Reset}`)
	// }

	// return res;

}

function test2(alg) {
	const passengers = [
		{ id: "A", preferredTime: 6 },
		{ id: "B", preferredTime: 7 },
		{ id: "C", preferredTime: 8 },
		{ id: "D", preferredTime: 14 },
	];

	const cars = [
		{ id: 1, departureTime: 4, capacity: 1 },
		{ id: 2, departureTime: 4, capacity: 1 },
		{ id: 3, departureTime: 4, capacity: 1 },
		{ id: 4, departureTime: 9, capacity: 1 },
	];
	const expectedDifference = 14;

	// D -> 4
	// C -> 1
	// B -> 2
	// A -> 3

	const res = assignPassengers8(passengers, cars);
	console.log(res)
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 2a passed${Reset}`);
	}


	return res;
}

function checkHalucination() { return false; }

function test3(alg) {
	const passengers = [
		{ id: "A", preferredTime: 5 },
		{ id: "B", preferredTime: 6 },
		{ id: "C", preferredTime: 7 },
		{ id: "D", preferredTime: 8 },
	];

	const cars = [
		{ id: 1, departureTime: 1, capacity: 1 },
		{ id: 2, departureTime: 2, capacity: 1 },
		{ id: 3, departureTime: 3, capacity: 1 },
		{ id: 4, departureTime: 4, capacity: 1 },
		{ id: 5, departureTime: 5, capacity: 1 },
		{ id: 6, departureTime: 6, capacity: 1 },
		{ id: 7, departureTime: 7, capacity: 1 },
		{ id: 8, departureTime: 8, capacity: 1 },
	];
	const expectedDifference = 0;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 3a passed${Reset}`);
	}


	return res;
}

function test4(alg) {
	const passengers = [
		{ id: "A", preferredTime: 1 },
		{ id: "B", preferredTime: 2 },
		{ id: "C", preferredTime: 3 },
		{ id: "D", preferredTime: 4 },
	];

	const cars = [
		{ id: 1, departureTime: 1, capacity: 1 },
		{ id: 2, departureTime: 2, capacity: 1 },
		{ id: 3, departureTime: 3, capacity: 1 },
		{ id: 4, departureTime: 4, capacity: 1 },
		{ id: 5, departureTime: 5, capacity: 1 },
		{ id: 6, departureTime: 6, capacity: 1 },
		{ id: 7, departureTime: 7, capacity: 1 },
		{ id: 8, departureTime: 8, capacity: 1 },
	];
	const expectedDifference = 0;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 4a passed${Reset}`);
	}


	return res;
}

function test5(alg) {
	const passengers = [
		{ id: "A", preferredTime: 1 },
		{ id: "B", preferredTime: 2 },
		{ id: "C", preferredTime: 3 },
		{ id: "D", preferredTime: 4 },
	];

	const cars = [
		{ id: 1, departureTime: 1, capacity: 1 },
		{ id: 2, departureTime: 2, capacity: 2 },
		{ id: 3, departureTime: 3, capacity: 1 },
	];
	const expectedDifference = 2;

	const res = assignPassengers8(passengers, cars);
	// console.log(res)
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 5a passed${Reset}`);
	}


	return res;
}

function test6(alg) {
	const passengers = [
		{ id: "A", preferredTime: 2 },
		{ id: "B", preferredTime: 4 },
		{ id: "C", preferredTime: 5 },
		{ id: "D", preferredTime: 6 },
		{ id: "E", preferredTime: 7 },
		{ id: "F", preferredTime: 7 },
		{ id: "G", preferredTime: 7 },
	];

	const cars = [
		{ id: 1, departureTime: 6, capacity: 1 },
		{ id: 2, departureTime: 6, capacity: 1 },
		{ id: 3, departureTime: 6, capacity: 1 },
	];
	const expectedDifference = 2;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 6a passed${Reset}`);
	}


	return res;
}

function test7(alg) {
	const passengers = [
		{ id: "A", preferredTime: 6 },
		{ id: "B", preferredTime: 19 },
		{ id: "C", preferredTime: 20 },
		{ id: "D", preferredTime: 21 },
	];

	const cars = [
		{ id: 1, departureTime: 20, capacity: 1 },
		{ id: 2, departureTime: 21, capacity: 1 },
		{ id: 3, departureTime: 22, capacity: 1 },
	];
	const expectedDifference = 3;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 7a passed${Reset}`);
	}


	return res;
}

function test8(alg) {
	const passengers = [
		{ id: "A", preferredTime: 7 },
		{ id: "B", preferredTime: 21 },
		{ id: "C", preferredTime: 10 },
		{ id: "D", preferredTime: 21 },
		{ id: "E", preferredTime: 14 },
		{ id: "F", preferredTime: 21 },
	];

	const cars = [
		{ id: 1, departureTime: 8, capacity: 1 },
		{ id: 2, departureTime: 15, capacity: 1 },
		{ id: 3, departureTime: 15, capacity: 1 },
	];
	const expectedDifference = 7;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 8a passed${Reset}`);
	}


	return res;
}

function test9(alg) {
	const passengers = [
		{ id: "A", preferredTime: 2 },
		{ id: "B", preferredTime: 2 },
		{ id: "C", preferredTime: 2 },
		{ id: "D", preferredTime: 2 },
		{ id: "E", preferredTime: 6 },
		{ id: "F", preferredTime: 7 },
		{ id: "G", preferredTime: 7 },
		{ id: "H", preferredTime: 7 },
	];

	const cars = [
		{ id: 1, departureTime: 7, capacity: 1 },
		{ id: 2, departureTime: 7, capacity: 1 },
		{ id: 3, departureTime: 5, capacity: 1 },
		{ id: 4, departureTime: 1, capacity: 1 },
	];
	const expectedDifference = 2;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 9a passed${Reset}`);
	}


	return res;
}

function test10(alg) {
	const passengers = [
		{ id: "A", preferredTime: 2 },
		{ id: "B", preferredTime: 2 },
		{ id: "C", preferredTime: 2 },
		{ id: "D", preferredTime: 2 },
		{ id: "E", preferredTime: 6 },
		{ id: "F", preferredTime: 7 },
		{ id: "G", preferredTime: 7 },
		{ id: "H", preferredTime: 7 },
	];

	const cars = [
		{ id: 1, departureTime: 8, capacity: 1 },
		{ id: 2, departureTime: 8, capacity: 1 },
		{ id: 3, departureTime: 5, capacity: 1 },
		{ id: 4, departureTime: 1, capacity: 1 },
	];
	const expectedDifference = 4;

	const res = assignPassengers8(passengers, cars);
	let total = 0;
	Object.keys(res).forEach((carId) => {
		const passIds = res[carId];
		passIds.forEach((passId) => {
			total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
		})
	});
	if (false) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (total !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${total} should have been ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 10a passed${Reset}`);
	}


	return res;
}

function main() {
	// return test10()
	try {
		test1();
	} catch { console.log("test crashed") }
	try {
		test2();
	} catch { console.log("test crashed") }
	try {
		test3();
	} catch { console.log("test crashed") }
	try {
		test4();
	} catch { console.log("test crashed") }
	try {
		test5();
	} catch (e) { console.log("test crashed") }
	try {
		test6();
	} catch { console.log("test crashed") }
	try {
		test7();
	} catch { console.log("test crashed") }
	try {
		test8();
	} catch { console.log("test crashed") }
	try {
		test9();
	} catch { console.log("test crashed") }
	try {
		test10();
	} catch { console.log("test crashed") }
}

m = "A"
main();
console.log("======")
m = "B"
main();

// const passengers = [
// 	{ id: "A", preferredTime: 2 },
// 	{ id: "B", preferredTime: 2 },
// 	{ id: "C", preferredTime: 2 },
// 	{ id: "D", preferredTime: 2 },
// 	{ id: "E", preferredTime: 6 },
// 	{ id: "F", preferredTime: 7 },
// 	{ id: "G", preferredTime: 7 },
// 	{ id: "H", preferredTime: 7 },
// ];

// const cars = [
// 	{ id: 1, departureTime: 7, capacity: 1 },
// 	{ id: 2, departureTime: 7, capacity: 1 },
// 	{ id: 3, departureTime: 5, capacity: 1 },
// 	{ id: 4, departureTime: 1, capacity: 1 },
// ];

// const res = assignPassengers8(passengers, cars);
// let total = 0;
// Object.keys(res).forEach((carId) => {
// 	const [passId] = res[carId];
// 	total += Math.abs(cars.find((car) => `${car.id}` === carId).departureTime - passengers.find((pass) => pass.id === passId).preferredTime);
// });
// console.log(total)