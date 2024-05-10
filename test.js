function assignPassengers1(passengers, cars) {
	// passengers: [{id: 1, preferredTime: 900}, ...]
	// cars: [{id: 1, departureTime: 915, capacity: 3}, ...]

	// Sorting passengers by their preferred time
	passengers.sort((a, b) => a.preferredTime - b.preferredTime);

	// Sort cars by departure time for efficient matching
	cars.sort((a, b) => a.departureTime - b.departureTime);

	// Initializing the assignments array
	const assignments = [];
	for (const car of cars) {
		car.currentLoad = 0; // Track current number of passengers
	}

	// Assign passengers to the closest available car time-wise that has capacity
	for (const passenger of passengers) {
		let bestCar = null;
		let minTimeDiff = Infinity;

		for (const car of cars) {
			const timeDiff = Math.abs(car.departureTime - passenger.preferredTime);

			if (timeDiff < minTimeDiff && car.currentLoad < car.capacity) {
				minTimeDiff = timeDiff;
				bestCar = car;
			}
		}

		if (bestCar) {
			bestCar.currentLoad++;
			assignments.push({ passengerId: passenger.id, carId: bestCar.id, timeDifference: minTimeDiff });
		} else {
			// No car available, handle overflow or unassigned cases
			// console.log("No available cars for passenger", passenger.id);
		}
	}

	return assignments;
}

function assignPassengers2(passengers, cars) {
	// Sort passengers by preferred time and cars by departure time
	passengers.sort((a, b) => a.preferredTime - b.preferredTime);
	cars.sort((a, b) => a.departureTime - b.departureTime);

	const assignments = [];
	const carUsage = cars.map(car => ({ ...car, currentLoad: 0 }));

	for (const passenger of passengers) {
		let bestMatch = null;
		let minDifference = Infinity;

		for (const car of carUsage) {
			if (car.currentLoad < car.capacity) {
				let timeDifference = Math.abs(car.departureTime - passenger.preferredTime);
				// Check if this car offers a better match
				if (timeDifference < minDifference) {
					minDifference = timeDifference;
					bestMatch = car;
				}
			}
		}

		if (bestMatch) {
			bestMatch.currentLoad++;
			assignments.push({
				passengerId: passenger.id,
				carId: bestMatch.id,
				departureTime: bestMatch.departureTime,
				preferredTime: passenger.preferredTime,
				timeDifference: minDifference
			});
		} else {
			// console.log("No available cars for passenger", passenger.id);
		}
	}

	return assignments;
}

// function assignPassengers3NOTWORKING(passengers, cars) {
// 	passengers.sort((a, b) => a.preferredTime - b.preferredTime);
// 	cars.sort((a, b) => a.departureTime - b.departureTime);

// 	const assignments = [];
// 	const carUsage = cars.map(car => ({ ...car, currentLoad: 0, closestPassenger: null }));
// 	const passengersCopy = passengers.map(p => ({ ...p, assigned: false }));
// 	while (carUsage.some(car => !car.closestPassenger)) {
// 		carUsage.forEach(car => car.closestPassenger = null);
// 		for (const passenger of passengersCopy) {
// 			if (passenger.assigned) continue;
// 			for (const car of carUsage) {
// 				if (car.currentLoad < car.capacity) {
// 					if (!car.closestPassenger || Math.abs(car.closestPassenger.preferredTime - car.departureTime) > Math.abs(passenger.preferredTime - car.departureTime)) {
// 						car.closestPassenger = passenger;
// 					}
// 				}
// 			}
// 			passenger.assigned = true;
// 			carUsage.find(car => car.closestPassenger === passenger).currentLoad++;
// 		}
// 	}

// 	for (const car of carUsage) {
// 		assignments.push({
// 			passengerId: car.closestPassenger.id,
// 			carId: car.id,
// 			departureTime: car.departureTime,
// 			preferredTime: car.closestPassenger.preferredTime,
// 			timeDifference: Math.abs(car.closestPassenger.preferredTime - car.departureTime)
// 		});
// 	}

// 	return assignments;
// }

function assignPassengers4(passengers, cars) {
	// Sort passengers by their preferred departure times
	passengers.sort((a, b) => a.preferredTime - b.preferredTime);

	// Sort cars by their actual departure times
	cars.sort((a, b) => a.departureTime - b.departureTime);

	// Initialize assignments array to keep track of where passengers are assigned
	let assignments = new Array(passengers.length).fill(-1); // -1 indicates unassigned

	// Keep track of each car's remaining capacity
	let carCapacities = cars.map(car => car.capacity);

	for (let i = 0; i < passengers.length; i++) {
		for (let j = 0; j < cars.length; j++) {
			if (passengers[i].preferredTime === cars[j].departureTime && carCapacities[j] > 0) {
				assignments[i] = cars[j].id;
				carCapacities[j]--;
				break;
			}
		}
	}

	// Assign passengers to cars
	for (let i = 0; i < cars.length; i++) {
		let j = 0; // Start checking from the first passenger
		while (carCapacities[i] > 0 && j < passengers.length) {
			// Check if this passenger is still unassigned and can be assigned to this car
			if (assignments[j] === -1) {
				assignments[j] = //cars[i].id
				{
					passengerId: passengers[j].id,
					carId: cars[i].id,
					departureTime: cars[i].departureTime,
					preferredTime: passengers[j].preferredTime,
					timeDifference: Math.abs(passengers[j].preferredTime - cars[i].departureTime)
				}

				carCapacities[i]--;
			}
			j++;
		}
	}

	// Calculate total difference in departure times
	let totalDifference = 0;
	for (let i = 0; i < passengers.length; i++) {
		if (assignments[i] !== -1) {
			let car = cars.find(c => c.id === assignments[i].carId);
			totalDifference += Math.abs(passengers[i].preferredTime - car.departureTime);
		}
	}

	// return {
	// 	assignments: assignments, // Passenger index to car ID
	// 	totalDifference: totalDifference
	// };

	return assignments;
}

function assignPassengers5(passengers, cars, ascending) {
	// Sort passengers by their preferred departure times
	if (ascending) {
		passengers.sort((a, b) => a.preferredTime - b.preferredTime);

		// Sort cars by their actual departure times
		cars.sort((a, b) => a.departureTime - b.departureTime);
	} else {
		passengers.sort((b, a) => a.preferredTime - b.preferredTime);

		// Sort cars by their actual departure times
		cars.sort((b, a) => a.departureTime - b.departureTime);
	}

	// Initialize assignments array to keep track of where passengers are assigned
	let assignments = new Array(passengers.length).fill(null);

	// Keep track of each car's remaining capacity
	let carCapacities = cars.map(car => car.capacity);

	// Try to assign each passenger to a car with the exact preferred departure time first
	for (let i = 0; i < passengers.length; i++) {
		for (let j = 0; j < cars.length; j++) {
			if (passengers[i].preferredTime === cars[j].departureTime && carCapacities[j] > 0) {
				assignments[i] = cars[j].id;
				carCapacities[j]--;
				break;
			}
		}
	}

	// Assign remaining unassigned passengers to the nearest available car
	for (let i = 0; i < passengers.length; i++) {
		if (assignments[i] === null) { // Still unassigned
			for (let j = 0; j < cars.length; j++) {
				if (carCapacities[j] > 0) {
					assignments[i] = cars[j].id;
					carCapacities[j]--;
					break;
				}
			}
		}
	}

	return assignments.map((carId, index) => ({
		passengerId: passengers[index].id,
		carId: carId,
		departureTime: carId ? cars.find((car) => car.id === carId).departureTime : null,
		preferredTime: passengers[index].preferredTime,
		timeDifference: carId ? Math.abs(passengers[index].preferredTime - cars.find((car) => car.id === carId).departureTime) : null,
	}))

}

function assignPassengers6(passengers, cars) {
	const res1 = { "output": assignPassengers5(passengers, cars, true) }
	const res2 = { "output": assignPassengers5(passengers, cars, false) }
	res1.total_difference =
		res1.output.reduce((acc, curr) => acc + curr.timeDifference, 0)
	res2.total_difference =
		res2.output.reduce((acc, curr) => acc + curr.timeDifference, 0)
	return (res1.total_difference > res2.total_difference ? res2.output : res1.output)
}

// calculate each passenger's closest car
// assign any passengers where the car has only been matched with one person
// any cars with more than one closest passenger, for each passenger find their 2nd closest, make the one with the closer 2nd choice take their 2nd choice
// repeat the last step until all cars are full

// const passengers = [
// 	{ id: "A", preferredTime: 2 },
// ];

// const cars = [
// 	{ id: 1, departureTime: 8, capacity: 1 },
// ];

function findClosestCars(passengers, cars) {
	const tempMappings = {};
	for (let i = 0; i < cars.length; i++) {
		tempMappings[cars[i].id] = [];
	}

	// Assign passengers to the closest available car time-wise that has capacity
	for (let i = 0; i < passengers.length; i++) {
		const passenger = passengers[i];
		let minDiff = 1000000;
		let minId = -1;
		for (let j = 0; j < cars.length; j++) {
			const car = cars[j];
			if (car.capacity === 0) continue;
			const diff = Math.abs(car.departureTime - passenger.preferredTime);
			if (diff < minDiff) {
				minDiff = diff;
				minId = car.id;
			};
		}
		tempMappings[minId].push({ passengerId: passenger.id, timeDifference: minDiff });
	}

	return tempMappings
}

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
		tempMappings[passenger.id].push(...differences.map((diff) => diff))
	}

	return tempMappings
}

function assignPassengers7(passengers, cars) {
	console.log("Called with")
	console.log(passengers)
	console.log(cars)
	console.log("starting...")
	const finalMappings = {};
	for (let i = 0; i < cars.length; i++) {
		finalMappings[cars[i].id] = [];
	}

	const tempMappings = findClosestCars2(passengers, cars)
	return console.log(tempMappings)

	// Actually assign any exact matches
	for (let i = 0; i < Object.keys(tempMappings).length; i++) {
		const carId = Object.keys(tempMappings)[i];
		const passengers = tempMappings[carId];
		if (passengers.length <= cars[carId].capacity) {
			// push all passengers
			finalMappings[carId].push(...passengers);
			cars[carId].capacity -= passengers.length;
			if (cars[carId].capacity === 0) {
				delete tempMappings[carId];
			}
		}
		else { // if there are more passengers than capacity

		}
	}
	console.log("result")
	console.log(finalMappings);
	console.log(tempMappings);
	console.log("resulted")

	if (Object.keys(tempMappings).length !== 0) {
		assignPassengers7([...passengers].filter((passenger) => {
			for (let i = 0; i < Object.keys(finalMappings).length; i++) {
				const carId = Object.keys(finalMappings)[i];
				if (finalMappings[carId].some((pass) => pass.passengerId === passenger.id)) return false
			}
			return true

		}

		), [...cars].filter((car) => {
			return finalMappings[car.id].length < car.capacity
		}));
	}

}

// Locate passengers with a first choice that nobody else has
function findUnique(mappings) {
	const unique = [];
	for (let i = 0; i < Object.keys(mappings).length; i++) {
		const passengerId = Object.keys(mappings)[i];
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
		unique.push({passengerId, carId: firstChoice.id})
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
			passengers.push(passengerId)
		} else if (firstChoice.diff === lowestDiff && lowestId === firstChoice.id) {
			passengers.push(passengerId)
		}
	}

	return { lowestDiff, lowestId, passengers};
}

function removeCarFromMappings(mappings, carId) {
	for (let i = 0; i < Object.keys(mappings).length; i++) {
		const passengerId = Object.keys(mappings)[i];
		mappings[passengerId] = mappings[passengerId].filter((car) => car.id !== carId)
	}
}

function assignPassengers8(passengers, cars) {
	const finalMappings = {};
	for (let i = 0; i < cars.length; i++) {
		finalMappings[cars[i].id] = [];
	}

	const closest = findClosestCars2(passengers, cars)
	// console.log(closest)

	// Assign any cars with exact matches
	while (true) {
		const uniques = findUnique(closest);
		if (!uniques.length) {
			// find lowest diff
			const { lowestDiff, lowestId, passengers } = findLowestDiff(closest);


		} else {
			uniques.forEach(({carId, passengerId}) => {
				finalMappings[carId].push(passengerId);
				cars.find((car) => car.id === carId).capacity--;
				delete closest[passengerId]

				removeCarFromMappings(closest, carId);
			});

		}
		break;
	}
	console.log(finalMappings)
	console.log(closest)

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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)
	if (result.output[0].passengerId === "Alice"
		&& result.output[0].carId === 1
		&& result.output[1].passengerId === "Bob"
		&& result.output[1].carId === 2) {
		console.log(`${FgGreen}Test 1a passed${Reset}`);
	}
	else {
		console.error(`${FgRed}Test failed - 1a${Reset}`)
	}

	return result;

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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 2a passed${Reset}`);
	}


	return result;
}

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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 3a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 4a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 5a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 6a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 7a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 8a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 9a passed${Reset}`);
	}


	return result;
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

	const result = { "output": alg(passengers, cars) }
	result.total_difference =
		result.output.reduce((acc, curr) => acc + curr.timeDifference, 0)

	if (checkHalucination(result, cars)) {
		console.error(`${FgRed}Test failed - Halucination${Reset}`)
	}
	else if (result.total_difference !== expectedDifference) {
		console.error(`${FgRed}Test failed - Total difference ${result.total_difference} != ${expectedDifference}${Reset}`)
	}
	else {
		console.log(`${FgGreen}Test 10a passed${Reset}`);
	}


	return result;
}

function checkHalucination(result, cars) {
	const carCounts = {};
	result.output.forEach((assignment) => {
		const carId = assignment.carId;
		if (carCounts[carId]) {
			carCounts[carId]++;
		} else {
			carCounts[carId] = 1;
		}
	});

	for (const car of cars) {
		const carId = car.id;
		const expectedCount = car.capacity;
		const actualCount = carCounts[carId] || 0;

		if (actualCount > expectedCount) {
			console.error(`Car ${carId} has ${actualCount} assignments, but expected ${expectedCount}`);
			return true;
		}
	}
	return false;
}

const Reset = "\x1b[0m"
const FgGreen = "\x1b[32m"
const FgRed = "\x1b[31m"

function main() {

	// const algorithms = [assignPassengers1, assignPassengers2, assignPassengers4, assignPassengers5, assignPassengers6]
	const algorithms = [assignPassengers6]
	// console.log(assignPassengers(passengers, cars))
	for (const alg of algorithms) {
		console.log("\n")
		console.log(alg.name)
		try {
			test1(alg);
		} catch (error) {
			console.error(`${FgRed}Test 1 crashed${Reset}`);
		}

		try {
			test2(alg);
		} catch (error) {
			console.error(`${FgRed}Test 2 crashed${Reset}`);
		}

		try {
			test3(alg);
		} catch (error) {
			console.error(`${FgRed}Test 3 crashed${Reset}`);
		}

		try {
			test4(alg);
		} catch (error) {
			console.error(`${FgRed}Test 4 crashed${Reset}`);
		}

		try {
			test5(alg);
		} catch (error) {
			console.error(`${FgRed}Test 5 crashed${Reset}`);
		}

		try {
			test6(alg);
		} catch (error) {
			console.error(`${FgRed}Test 6 crashed${Reset}`);
		}

		try {
			test7(alg);
		} catch (error) {
			// throw error
			console.error(`${FgRed}Test 7 crashed${Reset}`);
		}
		try {
			test8(alg);
		} catch (error) {
			// throw error
			console.error(`${FgRed}Test 8 crashed${Reset}`);
		}
		try {
			test9(alg);
		} catch (error) {
			// throw error
			console.error(`${FgRed}Test 9 crashed${Reset}`);
		}

		try {
			test10(alg);
		} catch (error) {
			// throw error
			console.error(`${FgRed}Test 10 crashed${Reset}`);
		}
	}

	// calculate each passenger's closest car
	// assign any passengers where the car has only been matched with one person
	// any cars with more than one closest passenger, for each passenger find their 2nd closest, make the one with the closer 2nd choice take their 2nd choice
	// repeat the last step until all cars are full
}



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
// 	{ id: 1, departureTime: 8, capacity: 1 },
// 	{ id: 2, departureTime: 8, capacity: 1 },
// 	{ id: 3, departureTime: 5, capacity: 1 },
// 	{ id: 4, departureTime: 1, capacity: 1 },
// ];

// assignPassengers8(passengers, cars);