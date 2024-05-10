## Description of the proposed coordination mechanism implemented in the assignPassengersToRides() function (no more than 200 words):
Firstly, the ride requests and rides are sorted by departureTime. Then any exact matches between requested departure time and actual departure time are matched up. Any remaining requests are assigned to their closest ride respectively by iterating over both the request and ride array. This process is repeated for sorting both ascending and descending, after both have been done then the result that produced the lowest time deviation is chosen and the passengers are assigned to the rides produced by the function. During the final assignment, any passengers not assigned are refunded and any who are, the money is sent to the driver.

## Do you use any additional contract variables? If so, what is the purpose of each variable? (no more than 200 words):
I used a unit256 variable called rideCounter to keep track of the current maximum rideId so that I know what id to assign the next ride created.

In the coordination section I used a RideRequest array called rideRequests to keep track of all the pending requests.

## Do you use any additional data structures (structs)? If so, what is the purpose of each structure? (no more than 200 words):
  I used a struct called RideRequest {
        address passenger;
        Location source;
        Location destination;
        uint8 preferredTravelTime;
        uint256 maxPrice;
        uint256 rideId;
    }

It keeps track of each ride that has been requested but not assigned yet.



## Do you use any additional contract functions? If so, what is the purpose of each function? (no more than 200 words):
The following functions are helper functions for testing, the names are self-explanatory
- getRides() returns (Ride[] memory)
- getRideRequests() returns (RideRequest[] memory)
- getRideRequest(uint256 _rideId) returns (RideRequest memory)

**sortRidesAndRequests(bool ascending)** - sorts the available rides and ride requests in either ascending or descending order and is used before assignment takes place

**assignPassengers(bool ascending) returns (uint256[] memory)** - this is the main function that tries to assign the passengers in an optimal way and returns the rideIds to be assigned, aligned with the rideRequest array

**abs(int8 x) returns (uint8)** - provides the absolute value of an int

**totalDeviation(uint[] memory assignments) returns (uint)** - calculates the total deviation of an assignment

**assignRidesFinal(uint[] memory assignments)** - takes the assignments and actually performs them by modifying the rides

## Did you implement any additional test cases to test your smart contract? If so, what are these tests?
My contract passed some initial tests to check that rideRequests are received properly and they are sorted properly.
My contract passed 8 additional tests of various different arrangements of rides and ride requests producing the optimal time deviation.
