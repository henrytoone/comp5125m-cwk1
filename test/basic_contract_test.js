const { expect } = require("chai");
const { log } = require("console");

describe("CarPooling", function () {
    let carPooling;
    let carPoolingCoord;
    let user1;
    let user2;

    beforeEach(async function () {
        const CarPooling = await ethers.getContractFactory("CarPooling");
        const CarPoolingCoord = await ethers.getContractFactory("CarPoolingCoordination");
        [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, user11, user12, user13] = await ethers.getSigners();

        carPooling = await CarPooling.deploy();
        carPoolingCoord = await CarPoolingCoord.deploy();
    });

    it("should allow users to register as a passenger", async function () {
        // Check: Unregistered user should not be a passenger in the member struct
        await carPooling.getPassenger(user1.address).then((passenger) => {
            expect(passenger.isRegistered).to.be.false;
            expect(passenger.hasRide).to.be.false;
        })
        // Register user as a passenger
        await carPooling.connect(user1).passengerRegister();
        // Check: Registered user should be a passenger
        await carPooling.getPassenger(user1.address).then((passenger) => {
            expect(passenger.isRegistered).to.be.true;
            expect(passenger.hasRide).to.be.false;
        })
        // Check: Registered passenger should not be able to register as a passenger again
        await expect(carPooling.connect(user1).passengerRegister()).to.be.reverted;
    });

    it("should allow users to register as a driver", async function () {
        // Check: Unregistered user should not be a driver in the member struct
        await carPooling.getDriver(user1.address).then((driver) => {
            expect(driver.isRegistered).to.be.false;
            expect(driver.hasRide).to.be.false;
        })
        // Register user as a driver
        await carPooling.connect(user1).driverRegister();
        // Check: Registered user should be a driver in the member struct
        await carPooling.getDriver(user1.address).then((driver) => {
            expect(driver.isRegistered).to.be.true;
            expect(driver.hasRide).to.be.false;
        })
        // Check: Registered driver should not be able to register as a driver again
        await expect(carPooling.connect(user1).driverRegister()).to.be.reverted;
    });

    it("should allow drivers to create rides", async function () {
        // Check: Unregistered user should not be able to create a ride
        await expect(carPooling.connect(user1).createRide(10, 5, 10, 0, 1)).to.be.reverted;
        // Register user as a driver
        await carPooling.connect(user1).driverRegister();
        // Check: Registered driver should be able to create a ride with valid parameters and emit RideCreated event
        await expect(carPooling.connect(user1).createRide(10, 5, 10, 0, 1)).to.emit(carPooling, 'RideCreated').withArgs(0, user1.address, 10, 5, 10, 0, 1);
        await carPooling.getRideById(0).then((ride) => {
            expect(ride.driver).to.equal(user1.address);
            expect(ride.travelTime).to.equal(10);
            expect(ride.availableSeats).to.equal(5);
            expect(ride.seatPrice).to.equal(10);
            expect(ride.origin).to.equal(0);
            expect(ride.destination).to.equal(1);
            expect(ride.status).to.equal(0);
            expect(ride.passengerAddr.length).to.equal(0);
        })
    });

    it("should allow users to query rides", async function () {
        // Requires correct implementation of createRide
        // Create three rides
        await carPooling.connect(user1).driverRegister();
        await carPooling.connect(user1).createRide(10, 5, ethers.parseEther("10"), 0, 1);
        await carPooling.connect(user2).driverRegister();
        await carPooling.connect(user2).createRide(11, 3, ethers.parseEther("10"), 0, 1);
        await carPooling.connect(user3).driverRegister();
        await carPooling.connect(user3).createRide(12, 2, ethers.parseEther("10"), 1, 2);
        // Check: User should be able to query rides with valid parameters
        await carPooling.findRides(0, 1).then((rideIds) => {
            expect(rideIds.length).to.equal(2);
            expect(rideIds[0]).to.equal(0);
            expect(rideIds[1]).to.equal(1);
        })
        await carPooling.findRides(0, 2).then((rideIds) => {
            expect(rideIds.length).to.equal(0);
        })
        await carPooling.findRides(1, 2).then((rideIds) => {
            expect(rideIds.length).to.equal(1);
            expect(rideIds[0]).to.equal(2);
        })
    });

    it("should allow passengers to join rides", async function () {
        // Requires correct implementation of createRide
        // Create a ride
        await carPooling.connect(user1).driverRegister();
        await carPooling.connect(user1).createRide(10, 2, ethers.parseEther("10"), 0, 1);
        // Register user as a passenger
        await carPooling.connect(user2).passengerRegister();
        // Check: Registered passenger should not be able to join a ride with invalid parameters
        await expect(carPooling.connect(user2).joinRide(1)).to.be.reverted;
        await expect(carPooling.connect(user2).joinRide(0, { value: ethers.parseEther("9") })).to.be.reverted;
        // Check: Registered passenger should be able to join a ride with valid parameters and emit RideJoined event
        balanceBefore = await ethers.provider.getBalance(carPooling.getAddress());
        await expect(carPooling.connect(user2).joinRide(0, { value: ethers.parseEther("10") })).to.emit(carPooling, 'RideJoined').withArgs(0, user2.address);
        balanceAfter = await ethers.provider.getBalance(carPooling.getAddress());
        // Check: Joined ride should transfer funds to contract
        expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
        await carPooling.getRideById(0).then((ride) => {
            expect(ride.passengerAddr.length).to.equal(1);
            expect(ride.passengerAddr[0]).to.equal(user2.address);
        });
        // Check: Full ride should change status to booking closed
        await carPooling.connect(user3).passengerRegister();
        expect(await carPooling.connect(user3).joinRide(0, { value: ethers.parseEther("10") })).to.emit(carPooling, 'RideJoined').withArgs(0, user3.address);
        await carPooling.getRideById(0).then((ride) => {
            expect(ride.status).to.equal(1);
        });
    });

    describe("Allocate rides", async function () {
        let storageWorking = false;


        it("should store ride requests", async function () {
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user3).passengerRegister();
            await carPoolingCoord.connect(user3).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user4).passengerRegister();
            await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })
            // Check: requests are stored properly
            expect(await carPoolingCoord.getRideRequests().then((rideRequests) => {
                expect(rideRequests.length).to.equal(2);
                expect(rideRequests[0].passenger).to.equal(user3.address);
                expect(rideRequests[0].source).to.equal(0);
                expect(rideRequests[0].destination).to.equal(1);
                expect(rideRequests[0].preferredTravelTime).to.equal(6);
                expect(ethers.formatEther(rideRequests[0].maxPrice)).to.equal('10.0');
                expect(rideRequests[1].passenger).to.equal(user4.address);
                expect(rideRequests[1].source).to.equal(0);
                expect(rideRequests[1].destination).to.equal(1);
                expect(rideRequests[1].preferredTravelTime).to.equal(10);
                expect(ethers.formatEther(rideRequests[1].maxPrice)).to.equal('10.0');
            }));

            storageWorking = true;

        });
        // it("should sort ride requests", async function () {
        //     if (!storageWorking) this.skip();
        //     await carPoolingCoord.connect(user1).driverRegister();
        //     await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

        //     await carPoolingCoord.connect(user2).driverRegister();
        //     await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

        //     await carPoolingCoord.connect(user4).passengerRegister();
        //     await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })
        //     await carPoolingCoord.connect(user3).passengerRegister();
        //     await carPoolingCoord.connect(user3).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
        //     await carPoolingCoord.assignPassengersToRides();
        //     await carPoolingCoord.getRideRequests().then((requests) => {
        //         expect(requests[0].passenger).to.equal(user3.address);
        //         expect(requests[1].passenger).to.equal(user4.address);
        //     });
        // })

        // it("should sort rides", async function () {
        //     if (!storageWorking) this.skip();
        //     await carPoolingCoord.connect(user2).driverRegister();
        //     await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);
        //     await carPoolingCoord.connect(user1).driverRegister();
        //     await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);


        //     await carPoolingCoord.assignPassengersToRides();
        //     await carPoolingCoord.getRides().then((rides) => {
        //         expect(rides[0].driver).to.equal(user1.address);
        //         expect(rides[0].travelTime).to.equal(8);
        //         expect(rides[1].driver).to.equal(user2.address);
        //         expect(rides[1].travelTime).to.equal(14);
        //     });
        // });

        it("should efficiently allocate rides (example)", async function () {
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user3).passengerRegister();
            await carPoolingCoord.connect(user3).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user4).passengerRegister();
            await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            // await carPoolingCoord.getRideRequests().then((rides) => log(rides));
            await carPoolingCoord.getRideById(0).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user3.address);
            });
            await carPoolingCoord.getRideById(1).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user4.address);
            });
        });

        it("should efficiently allocate rides (example flipped)", async function () {
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

            // request the rides in opposite order
            await carPoolingCoord.connect(user4).passengerRegister();
            await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user3).passengerRegister();
            await carPoolingCoord.connect(user3).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            await carPoolingCoord.getRideById(0).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user3.address);
            });
            await carPoolingCoord.getRideById(1).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user4.address);
            });
        });

        it("should efficiently allocate rides (1)", async function () {
            const expectedDifference = 6;
            const numberOfRequests = 2;
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

            // request the rides in opposite order
            await carPoolingCoord.connect(user3).passengerRegister();
            await carPoolingCoord.connect(user3).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user4).passengerRegister();
            await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            const requests = await carPoolingCoord.getRideRequests();
            let totalDifference = 0;
            for (let i = 0; i < numberOfRequests; i++) {
                await carPoolingCoord.getRideById(i).then(async (ride) => {
                    for (const p of ride.passengerAddr) {
                        const preferredTime = await carPoolingCoord.getRideRequests().then((requests) => {
                            return requests.find(r => r.passenger === p).preferredTravelTime;
                        })
                        totalDifference += Math.abs(Number(ride.travelTime) - Number(preferredTime));
                    }
                });
            }
            expect(totalDifference).to.equal(expectedDifference);
        });

        it("should efficiently allocate rides (2)", async function () {
            const expectedDifference = 14;
            const numberOfRequests = 4;
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(4, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(4, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user3).driverRegister();
            await carPoolingCoord.connect(user3).createRide(4, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user4).driverRegister();
            await carPoolingCoord.connect(user4).createRide(9, 1, ethers.parseEther("10"), 0, 1);


            // request the rides in opposite order
            await carPoolingCoord.connect(user5).passengerRegister();
            await carPoolingCoord.connect(user5).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user6).passengerRegister();
            await carPoolingCoord.connect(user6).awaitAssignRide(0, 1, 7, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user7).passengerRegister();
            await carPoolingCoord.connect(user7).awaitAssignRide(0, 1, 8, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user8).passengerRegister();
            await carPoolingCoord.connect(user8).awaitAssignRide(0, 1, 14, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            const requests = await carPoolingCoord.getRideRequests();
            let totalDifference = 0;
            for (let i = 0; i < numberOfRequests; i++) {
                await carPoolingCoord.getRideById(i).then(async (ride) => {
                    for (const p of ride.passengerAddr) {
                        const preferredTime = await carPoolingCoord.getRideRequests().then((requests) => {
                            return requests.find(r => r.passenger === p).preferredTravelTime;
                        })
                        totalDifference += Math.abs(Number(ride.travelTime) - Number(preferredTime));
                    }
                });
            }
            expect(totalDifference).to.equal(expectedDifference);
        });

        it("should efficiently allocate rides (3)", async function () {
            const expectedDifference = 0;
            const numberOfRequests = 4;
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(1, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(2, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user3).driverRegister();
            await carPoolingCoord.connect(user3).createRide(3, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user4).driverRegister();
            await carPoolingCoord.connect(user4).createRide(4, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user5).driverRegister();
            await carPoolingCoord.connect(user5).createRide(5, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user6).driverRegister();
            await carPoolingCoord.connect(user6).createRide(6, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user7).driverRegister();
            await carPoolingCoord.connect(user7).createRide(7, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user8).driverRegister();
            await carPoolingCoord.connect(user8).createRide(8, 1, ethers.parseEther("10"), 0, 1);


            // request the rides in opposite order
            await carPoolingCoord.connect(user9).passengerRegister();
            await carPoolingCoord.connect(user9).awaitAssignRide(0, 1, 5, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user10).passengerRegister();
            await carPoolingCoord.connect(user10).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user11).passengerRegister();
            await carPoolingCoord.connect(user11).awaitAssignRide(0, 1, 7, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user12).passengerRegister();
            await carPoolingCoord.connect(user12).awaitAssignRide(0, 1, 8, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            const requests = await carPoolingCoord.getRideRequests();
            let totalDifference = 0;
            for (let i = 0; i < numberOfRequests; i++) {
                await carPoolingCoord.getRideById(i).then(async (ride) => {
                    for (const p of ride.passengerAddr) {
                        const preferredTime = await carPoolingCoord.getRideRequests().then((requests) => {
                            return requests.find(r => r.passenger === p).preferredTravelTime;
                        })
                        totalDifference += Math.abs(Number(ride.travelTime) - Number(preferredTime));
                    }
                });
            }
            expect(totalDifference).to.equal(expectedDifference);
        });

        it("should efficiently allocate rides (5)", async function () {
            const expectedDifference = 2;
            const numberOfRequests = 4;
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(1, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(2, 2, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user3).driverRegister();
            await carPoolingCoord.connect(user3).createRide(3, 1, ethers.parseEther("10"), 0, 1);


            // request the rides in opposite order
            await carPoolingCoord.connect(user9).passengerRegister();
            await carPoolingCoord.connect(user9).awaitAssignRide(0, 1, 1, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user10).passengerRegister();
            await carPoolingCoord.connect(user10).awaitAssignRide(0, 1, 2, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user11).passengerRegister();
            await carPoolingCoord.connect(user11).awaitAssignRide(0, 1, 3, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user12).passengerRegister();
            await carPoolingCoord.connect(user12).awaitAssignRide(0, 1, 4, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            const requests = await carPoolingCoord.getRideRequests();
            let totalDifference = 0;
            for (let i = 0; i < numberOfRequests; i++) {
                await carPoolingCoord.getRideById(i).then(async (ride) => {
                    for (const p of ride.passengerAddr) {
                        const preferredTime = await carPoolingCoord.getRideRequests().then((requests) => {
                            return requests.find(r => r.passenger === p).preferredTravelTime;
                        })
                        totalDifference += Math.abs(Number(ride.travelTime) - Number(preferredTime));
                    }
                });
            }
            expect(totalDifference).to.equal(expectedDifference);
        });

        it("should efficiently allocate rides (10)", async function () {
            const expectedDifference = 2;
            const numberOfRequests = 4;
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(8, 2, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user3).driverRegister();
            await carPoolingCoord.connect(user3).createRide(5, 1, ethers.parseEther("10"), 0, 1);
            await carPoolingCoord.connect(user4).driverRegister();
            await carPoolingCoord.connect(user4).createRide(1, 1, ethers.parseEther("10"), 0, 1);


            // request the rides in opposite order
            await carPoolingCoord.connect(user5).passengerRegister();
            await carPoolingCoord.connect(user5).awaitAssignRide(0, 1, 2, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user6).passengerRegister();
            await carPoolingCoord.connect(user6).awaitAssignRide(0, 1, 2, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user7).passengerRegister();
            await carPoolingCoord.connect(user7).awaitAssignRide(0, 1, 2, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user8).passengerRegister();
            await carPoolingCoord.connect(user8).awaitAssignRide(0, 1, 2, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user9).passengerRegister();
            await carPoolingCoord.connect(user9).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user10).passengerRegister();
            await carPoolingCoord.connect(user10).awaitAssignRide(0, 1, 7, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user11).passengerRegister();
            await carPoolingCoord.connect(user11).awaitAssignRide(0, 1, 7, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user12).passengerRegister();
            await carPoolingCoord.connect(user12).awaitAssignRide(0, 1, 7, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            const requests = await carPoolingCoord.getRideRequests();
            let totalDifference = 0;
            for (let i = 0; i < numberOfRequests; i++) {
                await carPoolingCoord.getRideById(i).then(async (ride) => {
                    for (const p of ride.passengerAddr) {
                        const preferredTime = await carPoolingCoord.getRideRequests().then((requests) => {
                            return requests.find(r => r.passenger === p).preferredTravelTime;
                        })
                        totalDifference += Math.abs(Number(ride.travelTime) - Number(preferredTime));
                    }
                });
            }
            expect(totalDifference).to.equal(expectedDifference);
        });

        it("should efficiently allocate rides (example with origins)", async function () {
            if (!storageWorking) this.skip();
            await carPoolingCoord.connect(user1).driverRegister();
            await carPoolingCoord.connect(user1).createRide(8, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user3).driverRegister();
            await carPoolingCoord.connect(user3).createRide(14, 1, ethers.parseEther("10"), 1, 2);
            await carPoolingCoord.connect(user2).driverRegister();
            await carPoolingCoord.connect(user2).createRide(14, 1, ethers.parseEther("10"), 0, 1);

            await carPoolingCoord.connect(user7).driverRegister();
            await carPoolingCoord.connect(user7).createRide(8, 1, ethers.parseEther("10"), 1, 2);


            await carPoolingCoord.connect(user4).passengerRegister();
            await carPoolingCoord.connect(user4).awaitAssignRide(0, 1, 6, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user5).passengerRegister();
            await carPoolingCoord.connect(user5).awaitAssignRide(0, 1, 10, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user6).passengerRegister();
            await carPoolingCoord.connect(user6).awaitAssignRide(1, 2, 10, { value: ethers.parseEther("10") })
            await carPoolingCoord.connect(user8).passengerRegister();
            await carPoolingCoord.connect(user8).awaitAssignRide(1, 2, 6, { value: ethers.parseEther("10") })

            // Check: ride is assigned properly
            await carPoolingCoord.assignPassengersToRides();
            // await carPoolingCoord.getRideRequests().then((rides) => log(rides));
            await carPoolingCoord.getRideById(0).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user4.address);
            });
            await carPoolingCoord.getRideById(2).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user5.address);
            });
            await carPoolingCoord.getRideById(1).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user6.address);
            });
            await carPoolingCoord.getRideById(3).then((ride) => {
                expect(ride.passengerAddr.length).to.equal(1);
                expect(ride.availableSeats).to.equal(0);
                expect(ride.passengerAddr[0]).to.equal(user8.address);
            });
        });
    });

});

// struct Ride {
//     uint256 rideId;
//     address driver;
//     uint8 travelTime;
//     uint8 availableSeats;
//     uint8 totalSeats;
//     uint256 seatPrice;
//     Location origin;
//     Location destination;
//     RideStatus status; // status of the ride
//     address[] passengerAddr; // addresses of all passengers who booked the ride
// }