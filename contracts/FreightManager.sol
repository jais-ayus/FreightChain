// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract FreightManager {
    address public owner;

    enum DeliveryState { Available, AssignedForward, InTransitForward, DeliveredForward, AssignedReverse, InTransitReverse, DeliveredReverse }

    struct Vehicle {
        uint id;
        uint capacity;
        DeliveryState state;
        uint[] tripHistory;
    }

    struct Trip {
        uint id;
        string origin;
        string destination;
        uint cargoWeight;
        uint vehicleId;
        address user;
        uint escrowAmount;
        DeliveryState deliveryState;
        string ipfsHash;
    }

    mapping(uint => Vehicle) public vehicles;
    mapping(uint => Trip) public trips;
    uint public nextVehicleId = 1;
    uint public nextTripId = 1;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    function registerVehicle(uint _capacity) public onlyOwner {
        vehicles[nextVehicleId] = Vehicle({
            id: nextVehicleId,
            capacity: _capacity,
            state: DeliveryState.Available,
            tripHistory: new uint[](0)
        });
        nextVehicleId++;
    }

    function scheduleForwardTrip(string memory _origin, string memory _destination, uint _cargoWeight) public payable {
        // Basic check for minimum escrow amount (can be refined)
        require(msg.value > 0, "Minimum escrow amount required");

        trips[nextTripId] = Trip({
            id: nextTripId,
            origin: _origin,
            destination: _destination,
            cargoWeight: _cargoWeight,
            vehicleId: 0, // Vehicle not assigned yet
            user: msg.sender,
            escrowAmount: msg.value,
            deliveryState: DeliveryState.AssignedForward, // Start in Assigned state, waiting for vehicle
            ipfsHash: "" // IPFS hash will be added later
        });
        nextTripId++;
    }

    function assignVehicleToForwardTrip(uint _tripId, uint _vehicleId) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(_vehicleId > 0 && _vehicleId < nextVehicleId, "Invalid vehicle ID");
        require(trips[_tripId].deliveryState == DeliveryState.AssignedForward, "Trip is not pending assignment");
        require(vehicles[_vehicleId].state == DeliveryState.Available, "Vehicle is not available");

        trips[_tripId].vehicleId = _vehicleId;
        trips[_tripId].deliveryState = DeliveryState.InTransitForward; // Assuming assignment means it's now in transit

        vehicles[_vehicleId].state = DeliveryState.AssignedForward; // Update vehicle state after assignment
        vehicles[_vehicleId].tripHistory.push(_tripId);
    }

    function markForwardTripDelivered(uint _tripId) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(trips[_tripId].deliveryState == DeliveryState.InTransitForward, "Trip is not in transit");

        trips[_tripId].deliveryState = DeliveryState.DeliveredForward;
        vehicles[trips[_tripId].vehicleId].state = DeliveryState.DeliveredForward; // Vehicle is now eligible for reverse
    }

    function scheduleReverseTrip(uint _vehicleId, string memory _origin, string memory _destination, uint _cargoWeight) public payable {
        require(_vehicleId > 0 && _vehicleId < nextVehicleId, "Invalid vehicle ID");
        require(vehicles[_vehicleId].state == DeliveryState.DeliveredForward, "Vehicle has not completed a forward delivery");
        require(msg.value > 0, "Minimum escrow amount required");

        trips[nextTripId] = Trip({
            id: nextTripId,
            origin: _origin,
            destination: _destination,
            cargoWeight: _cargoWeight,
            vehicleId: _vehicleId,
            user: msg.sender,
            escrowAmount: msg.value,
            deliveryState: DeliveryState.AssignedReverse, // Waiting for admin assignment to start transit
            ipfsHash: "" // IPFS hash will be added later
        });
        vehicles[_vehicleId].tripHistory.push(nextTripId); // Add reverse trip to vehicle history
        nextTripId++;
    }

    function assignVehicleToReverseTrip(uint _tripId, uint _vehicleId) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(_vehicleId > 0 && _vehicleId < nextVehicleId, "Invalid vehicle ID");
        require(trips[_tripId].deliveryState == DeliveryState.AssignedReverse, "Trip is not pending reverse assignment");
        require(vehicles[_vehicleId].state == DeliveryState.DeliveredForward, "Vehicle is not eligible for reverse delivery");

        trips[_tripId].vehicleId = _vehicleId;
        trips[_tripId].deliveryState = DeliveryState.InTransitReverse;

        vehicles[_vehicleId].state = DeliveryState.InTransitReverse; // Update vehicle state to in transit for reverse
    }

    function markReverseTripDelivered(uint _tripId, string memory _ipfsHash) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(trips[_tripId].deliveryState == DeliveryState.InTransitReverse, "Trip is not in transit for reverse delivery");

        trips[_tripId].deliveryState = DeliveryState.DeliveredReverse;
        trips[_tripId].ipfsHash = _ipfsHash; // Store the IPFS hash

        uint vehicleId = trips[_tripId].vehicleId;
        vehicles[vehicleId].state = DeliveryState.Available; // Vehicle is now available again

        // Release escrow to the vehicle operator/owner (assuming contract owner for now)
        // In a real application, Vehicle struct might need an operator address
        payable(owner).transfer(trips[_tripId].escrowAmount);
    }

    // Smart contract logic will go here
} 