// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract FreightManager {
    address public owner;

    enum DeliveryState { Available, InTransitForward, DeliveredForward, AssignedReverse, InTransitReverse, DeliveredReverse }

    struct Vehicle {
        uint id;
        string vehicleIdString;
        uint capacity;
        DeliveryState state;
        uint[] tripHistory;
        string baseStation;
        uint currentReverseTripId;
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
        bool isForward;
    }

    mapping(string => uint) public vehicleIdStringToUint;
    mapping(uint => Vehicle) public vehicles;
    mapping(uint => Trip) public trips;
    uint public nextVehicleUintId = 1;
    uint public nextTripId = 1;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    function registerVehicle(string memory _vehicleIdString, uint _capacity, string memory _baseStation) public onlyOwner {
        require(vehicleIdStringToUint[_vehicleIdString] == 0, "Vehicle ID already registered");

        uint newVehicleUintId = nextVehicleUintId++;
        vehicleIdStringToUint[_vehicleIdString] = newVehicleUintId;

        vehicles[newVehicleUintId] = Vehicle({
            id: newVehicleUintId,
            vehicleIdString: _vehicleIdString,
            capacity: _capacity,
            state: DeliveryState.Available,
            tripHistory: new uint[](0),
            baseStation: _baseStation,
            currentReverseTripId: 0
        });

        emit VehicleRegistered(newVehicleUintId, _vehicleIdString, _capacity, _baseStation);
    }

    function scheduleForwardTrip(uint _vehicleId, string memory _origin, string memory _destination, uint _cargoWeight) public payable {
        require(_vehicleId > 0 && _vehicleId < nextVehicleUintId, "Invalid vehicle ID");
        require(vehicles[_vehicleId].state == DeliveryState.Available, "Vehicle is not available for forward assignment");
        require(msg.value > 0, "Minimum escrow amount required");

        trips[nextTripId] = Trip({
            id: nextTripId,
            origin: _origin,
            destination: _destination,
            cargoWeight: _cargoWeight,
            vehicleId: _vehicleId, // Vehicle assigned directly
            user: msg.sender,
            escrowAmount: msg.value,
            deliveryState: DeliveryState.InTransitForward, // Starts directly in InTransitForward state
            ipfsHash: "",
            isForward: true
        });

        vehicles[_vehicleId].state = DeliveryState.InTransitForward; // Update vehicle state
        vehicles[_vehicleId].tripHistory.push(nextTripId);

        emit ForwardTripScheduled(nextTripId, _origin, _destination, _cargoWeight, _vehicleId);
        nextTripId++;
    }

    function markForwardTripDelivered(uint _tripId) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(trips[_tripId].isForward, "Trip is not a forward trip");
        require(trips[_tripId].deliveryState == DeliveryState.InTransitForward, "Forward trip is not in transit");

        trips[_tripId].deliveryState = DeliveryState.DeliveredForward;
        vehicles[trips[_tripId].vehicleId].state = DeliveryState.DeliveredForward; // Vehicle is now eligible for reverse

        emit ForwardTripDelivered(_tripId, trips[_tripId].vehicleId);
    }

    function scheduleReverseTrip(uint _vehicleId, string memory _origin, string memory _destination, uint _cargoWeight) public payable {
        require(_vehicleId > 0 && _vehicleId < nextVehicleUintId, "Invalid vehicle ID");
        require(vehicles[_vehicleId].state == DeliveryState.DeliveredForward, "Vehicle has not completed a forward delivery");
        require(vehicles[_vehicleId].currentReverseTripId == 0, "Vehicle is already assigned to a reverse trip");
        require(msg.value > 0, "Minimum escrow amount required");

        uint newTripId = nextTripId++;

        trips[newTripId] = Trip({
            id: newTripId,
            origin: _origin,
            destination: _destination,
            cargoWeight: _cargoWeight,
            vehicleId: _vehicleId,
            user: msg.sender,
            escrowAmount: msg.value,
            deliveryState: DeliveryState.AssignedReverse, // Waiting for admin assignment to start transit
            ipfsHash: "",
            isForward: false
        });

        vehicles[_vehicleId].tripHistory.push(newTripId); // Add reverse trip to vehicle history
        vehicles[_vehicleId].currentReverseTripId = newTripId; // Set current reverse trip ID

        emit ReverseTripScheduled(newTripId, _vehicleId, _origin, _destination, _cargoWeight);
    }

    function assignVehicleToReverseTrip(uint _tripId) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(!trips[_tripId].isForward, "Trip is not a reverse trip");
        require(trips[_tripId].deliveryState == DeliveryState.AssignedReverse, "Reverse trip is not pending assignment");

        uint vehicleId = trips[_tripId].vehicleId;
        require(vehicles[vehicleId].state == DeliveryState.AssignedReverse, "Vehicle state mismatch for reverse assignment");

        trips[_tripId].deliveryState = DeliveryState.InTransitReverse;
        vehicles[vehicleId].state = DeliveryState.InTransitReverse; // Update vehicle state to in transit for reverse

        // emit event if needed
    }

    function markReverseTripDelivered(uint _tripId, string memory _ipfsHash) public onlyOwner {
        require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        require(!trips[_tripId].isForward, "Trip is not a reverse trip");
        require(trips[_tripId].deliveryState == DeliveryState.InTransitReverse, "Reverse trip is not in transit for reverse delivery");

        trips[_tripId].deliveryState = DeliveryState.DeliveredReverse;
        trips[_tripId].ipfsHash = _ipfsHash; // Store the IPFS hash

        uint vehicleId = trips[_tripId].vehicleId;
        vehicles[vehicleId].state = DeliveryState.Available; // Vehicle is now available again
        vehicles[vehicleId].currentReverseTripId = 0; // Reset current reverse trip ID

        // Release escrow to the vehicle operator/owner (assuming contract owner for now)
        // In a real application, Vehicle struct might need an operator address
        payable(owner).transfer(trips[_tripId].escrowAmount);

        emit ReverseTripDelivered(_tripId, vehicleId, _ipfsHash);
    }

    // --- Functions for UI to retrieve data ---

    function getVehicle(uint _vehicleUintId) public view returns (Vehicle memory) {
        require(_vehicleUintId > 0 && _vehicleUintId < nextVehicleUintId, "Invalid vehicle ID");
        return vehicles[_vehicleUintId];
    }

    function getTrip(uint _tripId) public view returns (Trip memory) {
         require(_tripId > 0 && _tripId < nextTripId, "Invalid trip ID");
        return trips[_tripId];
    }

     function getVehicleUintId(string memory _vehicleIdString) public view returns (uint) {
        return vehicleIdStringToUint[_vehicleIdString];
    }

    // Function to get all vehicle uint IDs (for UI dropdowns/lists)
    function getAllVehicleUintIds() public view returns (uint[] memory) {
        uint[] memory allIds = new uint[](nextVehicleUintId - 1);
        for (uint i = 1; i < nextVehicleUintId; i++) {
            allIds[i - 1] = i;
        }
        return allIds;
    }

    // Function to get all trip IDs
     function getAllTripIds() public view returns (uint[] memory) {
        uint[] memory allIds = new uint[](nextTripId - 1);
        for (uint i = 1; i < nextTripId; i++) {
            allIds[i - 1] = i;
        }
        return allIds;
    }

    // Events
    event VehicleRegistered(uint id, string vehicleIdString, uint capacity, string baseStation);
    event ForwardTripScheduled(uint tripId, string origin, string destination, uint cargoWeight, uint vehicleId);
    event ForwardTripDelivered(uint tripId, uint vehicleId);
    event ReverseTripScheduled(uint tripId, uint vehicleId, string origin, string destination, uint cargoWeight);
    event ReverseTripDelivered(uint tripId, uint vehicleId, string ipfsHash);
} 