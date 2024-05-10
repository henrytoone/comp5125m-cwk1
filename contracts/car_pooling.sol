// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract CarPooling {
    enum RideStatus {
        BookingOpen,
        FullyBooked,
        Started,
        Completed
    }
    enum Location {
        A,
        B,
        C
    }

    struct Ride {
        uint256 rideId;
        address driver;
        uint8 travelTime;
        uint8 availableSeats;
        uint8 totalSeats;
        uint256 seatPrice;
        Location origin;
        Location destination;
        RideStatus status;
        address[] passengerAddr;
    }

    struct Driver {
        bool isRegistered;
        bool hasRide;
    }

    struct Passenger {
        bool isRegistered;
        bool hasRide;
    }

    mapping(uint256 => Ride) internal rides;
    mapping(address => Driver) internal drivers;
    mapping(address => Passenger) internal passengers;

    // Your auxiliary data structures here, if required
    uint256 internal rideCounter = 0;

    event RideCreated(
        uint256 rideId,
        address driver,
        uint8 travelTime,
        uint8 availableSeats,
        uint256 seatPrice,
        Location origin,
        Location destination
    );
    event RideJoined(uint256 rideId, address passenger);
    event RideStarted(uint256 rideId);
    event RideCompleted(uint256 rideId);

    modifier onlyDriver() {
        require(
            drivers[msg.sender].isRegistered,
            "Caller is not registered as a driver"
        );
        _;
    }
    modifier onlyPassenger() {
        require(
            passengers[msg.sender].isRegistered,
            "Caller is not registered as a passenger"
        );
        _;
    }
    modifier notDriver() {
        require(
            !drivers[msg.sender].isRegistered,
            "Caller is already registered as a driver"
        );
        _;
    }
    modifier notPassenger() {
        require(
            !passengers[msg.sender].isRegistered,
            "Caller is already registered as a passenger"
        );
        _;
    }
    modifier driverSingleRide() {
        require(
            !drivers[msg.sender].hasRide,
            "Driver already has an active ride"
        );
        _;
    }
    modifier passengerSingleRide() {
        require(
            !passengers[msg.sender].hasRide,
            "Passenger already has an active ride"
        );
        _;
    }

    function passengerRegister() public notPassenger {
        passengers[msg.sender] = Passenger(true, false);
    }

    function driverRegister() public notDriver {
        drivers[msg.sender] = Driver(true, false);
    }

    function createRide(
        uint8 _travelTime,
        uint8 _availableSeats,
        uint256 _seatPrice,
        Location _origin,
        Location _destination
    ) public onlyDriver driverSingleRide {
        require(
            _travelTime >= 0 && _travelTime <= 23,
            "Travel time must be between 0 and 23"
        );
        require(
            _origin != _destination,
            "Origin and destination must be different"
        );
        require(_seatPrice > 0, "Seat price must be greater than zero");
        require(
            _availableSeats > 0,
            "There must be at least one available seat"
        );

        uint256 rideId = rideCounter++;
        rides[rideId] = Ride({
            rideId: rideId,
            driver: msg.sender,
            travelTime: _travelTime,
            availableSeats: _availableSeats,
            totalSeats: _availableSeats,
            seatPrice: _seatPrice,
            origin: _origin,
            destination: _destination,
            status: RideStatus.BookingOpen,
            passengerAddr: new address[](0)
        });

        drivers[msg.sender].hasRide = true;
        emit RideCreated(
            rideId,
            msg.sender,
            _travelTime,
            _availableSeats,
            _seatPrice,
            _origin,
            _destination
        );
    }

    function findRides(
        Location _source,
        Location _destination
    ) public view returns (uint256[] memory) {
        uint256[] memory rideIds = new uint256[](rideCounter);
        uint256 count = 0;
        for (uint256 i = 0; i < rideCounter; i++) {
            Ride storage ride = rides[i];
            if (
                ride.status == RideStatus.BookingOpen &&
                ride.origin == _source &&
                ride.destination == _destination
            ) {
                rideIds[count++] = ride.rideId;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = rideIds[i];
        }
        return result;
    }

    function joinRide(
        uint256 _rideId
    ) public payable onlyPassenger passengerSingleRide {
        Ride storage ride = rides[_rideId];
        require(
            ride.status == RideStatus.BookingOpen,
            "This ride is not open for booking"
        );
        require(
            msg.value == ride.seatPrice,
            "Ether sent does not match the seat price"
        );
        require(ride.availableSeats > 0, "No seats available");

        ride.passengerAddr.push(msg.sender);
        ride.availableSeats--;

        if (ride.availableSeats == 0) {
            ride.status = RideStatus.FullyBooked;
        }

        passengers[msg.sender].hasRide = true;
        emit RideJoined(_rideId, msg.sender);
    }

    function startRide(uint256 _rideId) public onlyDriver {
        Ride storage ride = rides[_rideId];
        require(
            msg.sender == ride.driver,
            "Only the driver of this ride can start it"
        );
        require(
            ride.status != RideStatus.Started &&
                ride.status != RideStatus.Completed,
            "Ride has already been started or completed"
        );
        ride.status = RideStatus.Started;
        emit RideStarted(_rideId);
    }

    function completeRide(uint256 _rideId) public onlyDriver {
        Ride storage ride = rides[_rideId];
        require(
            msg.sender == ride.driver,
            "Only the driver of this ride can complete it"
        );
        require(ride.status == RideStatus.Started, "Ride is not in progress");
        ride.status = RideStatus.Completed;
        for (uint i = 0; i < ride.passengerAddr.length; i++) {
            payable(ride.driver).transfer(ride.seatPrice);
        }
        emit RideCompleted(_rideId);
    }

    // -------------------- Already implemented functions, do not modify ------------------

    function getDriver(address addr) public view returns (Driver memory) {
        return (drivers[addr]);
    }

    function getPassenger(address addr) public view returns (Passenger memory) {
        return (passengers[addr]);
    }

    function getRideById(uint256 _rideId) public view returns (Ride memory) {
        return (rides[_rideId]);
    }
}

// ----------------------------------- Coordination -----------------------------------

contract CarPoolingCoordination is CarPooling {
    event TestEvent(uint256[] result);
    // Your data structures here
    struct RideRequest {
        address passenger;
        Location source;
        Location destination;
        uint8 preferredTravelTime;
        uint256 maxPrice;
        uint256 rideId;
    }

    function getRides() public view returns (Ride[] memory) {
        Ride[] memory result = new Ride[](rideCounter);
        for (uint256 i = 0; i < rideCounter; i++) {
            result[i] = rides[i];
        }
        return result;
    }

    RideRequest[] rideRequests;

    function getRideRequests() public view returns (RideRequest[] memory) {
        RideRequest[] memory result = new RideRequest[](rideRequests.length);
        for (uint256 i = 0; i < rideRequests.length; i++) {
            result[i] = rideRequests[i];
        }
        return result;
    }

    function getRideRequest(
        uint256 _rideId
    ) public view returns (RideRequest memory) {
        return (rideRequests[_rideId]);
    }

    function awaitAssignRide(
        Location _source,
        Location _destination,
        uint8 preferredTravelTime
    ) public payable onlyPassenger {
        require(
            passengers[msg.sender].hasRide == false,
            "Passenger already has an active ride"
        );
        require(
            _source != _destination,
            "Source and destination must be different"
        );
        require(
            preferredTravelTime >= 0 && preferredTravelTime <= 23,
            "Travel time must be between 0 and 23"
        );
        require(msg.value > 0, "Ether must be sent as a deposit");

        rideRequests.push(
            RideRequest({
                passenger: msg.sender,
                source: _source,
                destination: _destination,
                preferredTravelTime: preferredTravelTime,
                maxPrice: msg.value,
                rideId: 2 ** 256 - 1
            })
        );
        passengers[msg.sender].hasRide = true;
    }

    function sortRidesAndRequests(bool ascending) public {
        for (uint i = 0; i < rideRequests.length; i++) {
            for (uint j = 0; j < rideRequests.length - i - 1; j++) {
                if (
                    (ascending &&
                        rideRequests[j].preferredTravelTime >
                        rideRequests[j + 1].preferredTravelTime) ||
                    (!ascending &&
                        rideRequests[j].preferredTravelTime <
                        rideRequests[j + 1].preferredTravelTime)
                ) {
                    RideRequest memory temp = rideRequests[j];
                    rideRequests[j] = rideRequests[j + 1];
                    rideRequests[j + 1] = temp;
                }
            }
        }

        // sort the rides based on departureTime
        for (uint i = 0; i < rideCounter; i++) {
            for (uint j = 0; j < rideCounter - i - 1; j++) {
                if (
                    (ascending &&
                        rides[j].travelTime > rides[j + 1].travelTime) ||
                    (!ascending &&
                        rides[j].travelTime < rides[j + 1].travelTime)
                ) {
                    Ride memory temp = rides[j];
                    rides[j] = rides[j + 1];
                    rides[j + 1] = temp;
                }
            }
        }
    }

    function assignPassengers5(
        bool ascending
    ) public returns (uint256[] memory) {
        sortRidesAndRequests(ascending);
        uint256[] memory assignments = new uint256[](rideRequests.length);
        for (uint256 i = 0; i < rideRequests.length; i++) {
            assignments[i] = 2 ** 256 - 1;
        }
        emit TestEvent(assignments);
        uint256[] memory carCapacities = new uint256[](rideCounter);
        for (uint256 i = 0; i < rideCounter; i++) {
            carCapacities[i] = rides[i].availableSeats;
        }

        // Try to assign each passenger to a car with the exact preferred departure time first
        for (uint i = 0; i < rideRequests.length; i++) {
            for (uint j = 0; j < rideCounter; j++) {
                if (
                    rideRequests[i].source == rides[j].origin &&
                    rideRequests[i].destination == rides[j].destination &&
                    rideRequests[i].preferredTravelTime ==
                    rides[j].travelTime &&
                    carCapacities[j] > 0
                ) {
                    assignments[i] = rides[j].rideId;
                    carCapacities[j]--;
                    break;
                }
            }
        }

        // Assign remaining unassigned passengers to the nearest available car
        for (uint i = 0; i < rideRequests.length; i++) {
            if (assignments[i] == 2 ** 256 - 1) {
                // Still unassigned
                for (uint j = 0; j < rideCounter; j++) {
                    if (
                        rideRequests[i].source == rides[j].origin &&
                        rideRequests[i].destination == rides[j].destination &&
                        carCapacities[j] > 0
                    ) {
                        assignments[i] = rides[j].rideId;
                        carCapacities[j]--;
                        break;
                    }
                }
            }
        }
        return assignments;
    }

    function abs(int8 x) private pure returns (uint8) {
        return uint8(x >= 0 ? x : -x);
    }

    function totalDeviation(
        uint[] memory assignments
    ) public view returns (uint) {
        uint total = 0;
        for (uint i = 0; i < rideRequests.length; i++) {
            total += abs(
                int8(rideRequests[i].preferredTravelTime) -
                    int8(rides[assignments[i]].travelTime)
            );
        }
        return total;
    }

    function assignRidesFinal(uint[] memory assignments) public {
        for (uint i = 0; i < rideRequests.length; i++) {
            RideRequest storage request = rideRequests[i];
            if (assignments[i] != 2 ** 256 - 1) {
                Ride storage ride = rides[assignments[i]];
                ride.passengerAddr.push(request.passenger);
                ride.availableSeats--;
                if (ride.availableSeats == 0) {
                    ride.status = RideStatus.FullyBooked;
                }
                payable(ride.driver).transfer(
                    request.maxPrice - ride.seatPrice
                );
            } else {
                passengers[request.passenger].hasRide = false;
                payable(request.passenger).transfer(request.maxPrice);
            }
        }
    }

    function assignPassengersToRides() public {
        uint[] memory rideIdAssignmentsAsc = assignPassengers5(true);
        uint[] memory rideIdAssignmentsDesc = assignPassengers5(false);
        if (
            totalDeviation(rideIdAssignmentsAsc) <
            totalDeviation(rideIdAssignmentsDesc)
        ) {
            sortRidesAndRequests(true);
            assignRidesFinal(rideIdAssignmentsAsc);
        } else {
            sortRidesAndRequests(false);
            assignRidesFinal(rideIdAssignmentsDesc);
        }
    }
}
