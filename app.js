let web3;
let accounts;
let contract;

// The contract address and ABI will be loaded here after deployment
const contractAddress = '0x1Eda09B0003e465CA823466407CC44ED3E35fEe8'; // Replace with deployed contract address
let contractABI; // Load from compiled contract artifact

window.addEventListener('load', async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            // Request account access if needed
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            accounts = await web3.eth.getAccounts();
            document.getElementById('account-address').innerText = accounts[0];
            document.getElementById('connection-status').innerText = 'Connected';
            // Load contract ABI and instantiate contract
            loadContract();
        } catch (error) {
            // User denied account access...
            console.error("User denied account access:", error);
            document.getElementById('connection-status').innerText = 'Connection Denied';
        }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
        accounts = await web3.eth.getAccounts();
        document.getElementById('account-address').innerText = accounts[0];
        document.getElementById('connection-status').innerText = 'Connected (Legacy)';
        // Load contract ABI and instantiate contract
        loadContract();
    }
    // Non-dapp browsers...
    else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
        document.getElementById('connection-status').innerText = 'No Ethereum Provider';
    }
});

async function loadContract() {
    // Fetch the contract artifact (contains ABI and bytecode)
    try {
        const response = await fetch('./build/contracts/FreightManager.json');
        const artifact = await response.json();
        contractABI = artifact.abi;

        if (contractAddress !== 'YOUR_CONTRACT_ADDRESS') {
             contract = new web3.eth.Contract(contractABI, contractAddress);
             console.log("Contract loaded:", contract);
             // Initial data load
             fetchAndDisplayVehicles();
             fetchAndDisplayTrips();
        } else {
            console.warn("Contract address not set. Cannot instantiate contract. Please deploy the contract and update contractAddress.");
        }

    } catch (e) {
        console.error("Error loading contract artifact:", e);
        document.getElementById('connection-status').innerText = 'Error loading contract';
    }
}

// --- Event Listeners for Forms ---

// Vehicle Registration
document.getElementById('register-vehicle-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicleIdString = document.getElementById('vehicle-id-string').value;
    const capacity = document.getElementById('vehicle-capacity').value;
    const baseStation = document.getElementById('base-station').value;

    if (contract) {
        await registerVehicle(vehicleIdString, capacity, baseStation);
    } else {
        console.error("Contract not loaded.");
    }
});

// Forward Trip Scheduling
document.getElementById('schedule-forward-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicleId = document.getElementById('forward-vehicle-id').value;
    const origin = document.getElementById('forward-origin').value;
    const destination = document.getElementById('forward-destination').value;
    const cargoWeight = document.getElementById('forward-cargo-weight').value;
    const escrowAmount = document.getElementById('forward-escrow').value;

    if (contract) {
        const escrowAmountWei = web3.utils.toWei(escrowAmount, 'ether');
        await scheduleForwardTrip(vehicleId, origin, destination, cargoWeight, escrowAmountWei);
    } else {
        console.error("Contract not loaded.");
    }
});

// Reverse Delivery Scheduling
document.getElementById('schedule-reverse-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicleId = document.getElementById('reverse-vehicle-id').value;
    const origin = document.getElementById('reverse-origin').value; // This should be autofilled
    const destination = document.getElementById('reverse-destination').value;
    const cargoWeight = document.getElementById('reverse-cargo-weight').value;
    const escrowAmount = document.getElementById('reverse-escrow').value;

    if (contract) {
         const escrowAmountWei = web3.utils.toWei(escrowAmount, 'ether');
        await scheduleReverseTrip(vehicleId, origin, destination, cargoWeight, escrowAmountWei);
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Assign Vehicle to Reverse Trip
document.getElementById('admin-assign-reverse-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-assign-reverse-trip-id').value;

     if (contract) {
        await assignVehicleToReverseTrip(tripId);
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Mark Trip Delivered (Forward or Reverse)
document.getElementById('admin-mark-delivered-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-mark-delivered-trip-id').value;
    const ipfsHash = document.getElementById('admin-mark-delivered-ipfs-hash').value;

    if (contract) {
        // Need to determine if it's a forward or reverse trip to call the correct function
        // For simplicity now, let's assume the smart contract handles it or we add a check here.
        // Based on the refactored contract, markForwardTripDelivered takes only tripId,
        // and markReverseTripDelivered takes tripId and ipfsHash. We'll call markReverseTripDelivered
        // if ipfsHash is provided, otherwise markForwardTripDelivered.
         if (ipfsHash) {
             await markReverseTripDelivered(tripId, ipfsHash);
         } else {
             await markForwardTripDelivered(tripId);
         }

    } else {
        console.error("Contract not loaded.");
    }
});

// --- Functions to Interact with Contract ---

async function registerVehicle(vehicleIdString, capacity, baseStation) {
    console.log("Attempting to register vehicle with ID:", vehicleIdString, "capacity:", capacity, "base station:", baseStation);
    try {
        const result = await contract.methods.registerVehicle(vehicleIdString, capacity, baseStation).send({ from: accounts[0] });
        console.log("Vehicle registered:", result);
        // Refresh vehicle list and dropdowns
        fetchAndDisplayVehicles();
        populateVehicleDropdowns();
        // TODO: Display success message
    } catch (error) {
        console.error("Error registering vehicle:", error);
        // TODO: Display error message in UI
    }
}

async function scheduleForwardTrip(vehicleId, origin, destination, cargoWeight, escrowAmountWei) {
    console.log(`Attempting to schedule forward trip for vehicle ${vehicleId} from ${origin} to ${destination} with cargo weight ${cargoWeight} and escrow ${web3.utils.fromWei(escrowAmountWei, 'ether')} ETH`);
    try {
        const result = await contract.methods.scheduleForwardTrip(vehicleId, origin, destination, cargoWeight).send({
            from: accounts[0],
            value: escrowAmountWei
        });
        console.log("Forward trip scheduled:", result);
        // Refresh trip list and vehicle dropdowns
        fetchAndDisplayTrips();
        populateVehicleDropdowns();
        // TODO: Display success message
    } catch (error) {
        console.error("Error scheduling forward trip:", error);
        // TODO: Display error message in UI
    }
}

async function assignVehicleToReverseTrip(tripId) {
     console.log(`Attempting to assign vehicle to reverse trip ${tripId}...`);
    try {
        const result = await contract.methods.assignVehicleToReverseTrip(tripId).send({ from: accounts[0] });
        console.log("Vehicle assigned to reverse trip:", result);
         // Refresh trip list and vehicle dropdowns
        fetchAndDisplayTrips();
        populateVehicleDropdowns();
        // TODO: Display success message
    } catch (error) {
        console.error("Error assigning vehicle to reverse trip:", error);
        // TODO: Display error message in UI
    }
}

async function markForwardTripDelivered(tripId) {
     console.log(`Attempting to mark forward trip ${tripId} as delivered...`);
    try {
        const result = await contract.methods.markForwardTripDelivered(tripId).send({ from: accounts[0] });
        console.log("Forward trip marked delivered:", result);
         // Refresh trip list and vehicle list/dropdowns
        fetchAndDisplayTrips();
        fetchAndDisplayVehicles();
        populateVehicleDropdowns();
        // TODO: Display success message
    } catch (error) {
        console.error("Error marking forward trip delivered:", error);
        // TODO: Display error message in UI
    }
}

async function scheduleReverseTrip(vehicleId, origin, destination, cargoWeight, escrowAmountWei) {
     console.log(`Attempting to schedule reverse trip for vehicle ${vehicleId} from ${origin} to ${destination} with cargo weight ${cargoWeight} and escrow ${web3.utils.fromWei(escrowAmountWei, 'ether')} ETH`);
    try {
        const result = await contract.methods.scheduleReverseTrip(vehicleId, origin, destination, cargoWeight).send({
            from: accounts[0],
            value: escrowAmountWei
        });
        console.log("Reverse trip scheduled:", result);
        // Refresh trip list and vehicle dropdowns
        fetchAndDisplayTrips();
        populateVehicleDropdowns();
        // TODO: Display success message
    } catch (error) {
        console.error("Error scheduling reverse trip:", error);
        // TODO: Display error message in UI
    }
}

async function markReverseTripDelivered(tripId, ipfsHash) {
    console.log(`Attempting to mark reverse trip ${tripId} as delivered with IPFS hash ${ipfsHash}...`);
    try {
        const result = await contract.methods.markReverseTripDelivered(tripId, ipfsHash).send({ from: accounts[0] });
        console.log("Reverse trip marked delivered:", result);
        // Refresh trip list and vehicle list/dropdowns
        fetchAndDisplayTrips();
        fetchAndDisplayVehicles();
        populateVehicleDropdowns();
        // TODO: Display success message and confirm escrow release
    } catch (error) {
        console.error("Error marking reverse trip delivered:", error);
        // TODO: Display error message in UI
    }
}

// --- Functions to Fetch and Display Data ---

async function fetchAndDisplayVehicles() {
    if (!contract) return;
    console.log("Fetching vehicles...");
    try {
        const vehicleListDiv = document.getElementById('vehicle-list');
        vehicleListDiv.innerHTML = ''; // Clear current list

        const allVehicleUintIds = await contract.methods.getAllVehicleUintIds().call();
        
        if (allVehicleUintIds.length === 0) {
            vehicleListDiv.innerHTML = '<p>No vehicles registered yet.</p>';
            return;
        }

        for (const uintId of allVehicleUintIds) {
            const vehicle = await contract.methods.getVehicle(uintId).call();
            const vehicleDiv = document.createElement('div');
            vehicleDiv.classList.add('vehicle-item');
            vehicleDiv.innerHTML = `
                <p><strong>ID:</strong> ${vehicle.vehicleIdString} (Internal: ${vehicle.id})</p>
                <p><strong>Capacity:</strong> ${vehicle.capacity}</p>
                <p><strong>State:</strong> ${getDeliveryStateString(vehicle.state)}</p>
                <p><strong>Base Station:</strong> ${vehicle.baseStation}</p>
                <p><strong>Trip History:</strong> ${vehicle.tripHistory.join(', ')}</p>
                <p><strong>Current Reverse Trip:</strong> ${vehicle.currentReverseTripId == 0 ? 'None' : vehicle.currentReverseTripId}</p>
            `;
            vehicleListDiv.appendChild(vehicleDiv);
        }
    } catch (error) {
        console.error("Error fetching vehicles:", error);
         vehicleListDiv.innerHTML = '<p>Error loading vehicles.</p>';
    }
}

async function fetchAndDisplayTrips() {
    if (!contract) return;
     console.log("Fetching trips...");
    try {
        const forwardTripListDiv = document.getElementById('forward-trip-list');
        const reverseTripListDiv = document.getElementById('reverse-trip-list');
        forwardTripListDiv.innerHTML = ''; // Clear current list
        reverseTripListDiv.innerHTML = ''; // Clear current list

        const allTripIds = await contract.methods.getAllTripIds().call();

         if (allTripIds.length === 0) {
            forwardTripListDiv.innerHTML = '<p>No forward trips scheduled yet.</p>';
            reverseTripListDiv.innerHTML = '<p>No reverse trips scheduled yet.</p>';
            return;
        }

        for (const tripId of allTripIds) {
            const trip = await contract.methods.getTrip(tripId).call();
            const tripDiv = document.createElement('div');
            tripDiv.classList.add('trip-item');
            tripDiv.innerHTML = `
                <p><strong>Trip ID:</strong> ${trip.id}</p>
                <p><strong>Type:</strong> ${trip.isForward ? 'Forward' : 'Reverse'}</p>
                <p><strong>Vehicle Internal ID:</strong> ${trip.vehicleId}</p>
                <p><strong>Origin:</strong> ${trip.origin}</p>
                <p><strong>Destination:</strong> ${trip.destination}</p>
                <p><strong>Cargo Weight:</strong> ${trip.cargoWeight}</p>
                <p><strong>User:</strong> ${trip.user}</p>
                <p><strong>Escrow Amount:</strong> ${web3.utils.fromWei(trip.escrowAmount, 'ether')} ETH</p>
                <p><strong>State:</strong> ${getDeliveryStateString(trip.deliveryState)}</p>
                <p><strong>IPFS Hash:</strong> ${trip.ipfsHash ? trip.ipfsHash : 'N/A'}</p>
            `;

            if(trip.isForward) {
                forwardTripListDiv.appendChild(tripDiv);
            } else {
                 reverseTripListDiv.appendChild(tripDiv);
            }
        }
         if (forwardTripListDiv.innerHTML === '') {
             forwardTripListDiv.innerHTML = '<p>No forward trips scheduled yet.</p>';
         }
          if (reverseTripListDiv.innerHTML === '') {
             reverseTripListDiv.innerHTML = '<p>No reverse trips scheduled yet.</p>';
         }

    } catch (error) {
        console.error("Error fetching trips:", error);
        forwardTripListDiv.innerHTML = '<p>Error loading trips.</p>';
        reverseTripListDiv.innerHTML = '<p>Error loading trips.</p>';
    }
}

async function populateVehicleDropdowns() {
     if (!contract) return;
     console.log("Populating vehicle dropdowns...");
    try {
        const forwardSelect = document.getElementById('forward-vehicle-id');
        const reverseSelect = document.getElementById('reverse-vehicle-id');

        // Clear current options except the default
        forwardSelect.innerHTML = '<option value="">--Select Vehicle--</option>';
        reverseSelect.innerHTML = '<option value="">--Select Vehicle--</option>';

        const allVehicleUintIds = await contract.methods.getAllVehicleUintIds().call();

        for (const uintId of allVehicleUintIds) {
            const vehicle = await contract.methods.getVehicle(uintId).call();

            // Populate forward dropdown (Available vehicles)
            if (vehicle.state == getDeliveryStateEnum('Available')) {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.innerText = `${vehicle.vehicleIdString} (ID: ${vehicle.id})`;
                forwardSelect.appendChild(option);
            }

            // Populate reverse dropdown (DeliveredForward and not on a reverse trip)
            if (vehicle.state == getDeliveryStateEnum('DeliveredForward') && vehicle.currentReverseTripId == 0) {
                 const option = document.createElement('option');
                option.value = vehicle.id;
                option.innerText = `${vehicle.vehicleIdString} (ID: ${vehicle.id})`;
                 reverseSelect.appendChild(option);
            }
        }

    } catch (error) {
        console.error("Error populating vehicle dropdowns:", error);
    }
}

// Helper function to convert DeliveryState enum index to string
function getDeliveryStateString(stateIndex) {
    const states = ["Available", "InTransitForward", "DeliveredForward", "AssignedReverse", "InTransitReverse", "DeliveredReverse"];
    return states[stateIndex];
}

// Helper function to get DeliveryState enum index from string
function getDeliveryStateEnum(stateString) {
     const states = {"Available": 0, "InTransitForward": 1, "DeliveredForward": 2, "AssignedReverse": 3, "InTransitReverse": 4, "DeliveredReverse": 5};
     return states[stateString];
}

// Populate dropdowns and display lists on initial load
window.addEventListener('load', async () => {
    // ... existing web3 connection logic ...
     // Move initial data load here after contract is potentially loaded
    // This part is already in loadContract, but adding here for clarity if needed
});

// Re-run data fetching and dropdown population after contract interactions
// This is handled by calling the functions within the async functions for transactions.

// Autofill reverse origin when vehicle is selected (requires fetching vehicle's last trip destination)
document.getElementById('reverse-vehicle-id').addEventListener('change', async (event) => {
    const vehicleId = event.target.value;
    const reverseOriginInput = document.getElementById('reverse-origin');
    reverseOriginInput.value = ''; // Clear previous value

    if (!contract || !vehicleId || vehicleId == "") return;

    try {
        const vehicle = await contract.methods.getVehicle(vehicleId).call();
        if (vehicle.tripHistory.length > 0) {
            // Get the last trip ID from history
            const lastTripId = vehicle.tripHistory[vehicle.tripHistory.length - 1];
            const lastTrip = await contract.methods.getTrip(lastTripId).call();
            // If the last trip was a forward delivery, use its destination as reverse origin
            if (lastTrip.isForward && lastTrip.deliveryState == getDeliveryStateEnum('DeliveredForward')) {
                reverseOriginInput.value = lastTrip.destination;
            }
        }

    } catch (error) {
        console.error("Error fetching vehicle for reverse origin autofill:", error);
    }
}); 