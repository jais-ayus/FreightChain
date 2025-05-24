let web3;
let account; // Use a single account for transactions in this wallet-less setup
let contract;

// The contract address and ABI
const contractAddress = '0xf64E2a1f5a29eBe87c9E0c185540289e34b65898'; // Replace with deployed contract address
let contractABI; // Load from compiled contract artifact

// *** WARNING: Hardcoding private keys is insecure for production. ***
// Get a private key from your Ganache accounts for local testing.
// In Ganache GUI, click the key icon next to an account to get its private key.
const privateKey = '0x4e60bb08aec67cafa968f142d16b2f152285606747f2e7c345f61c72a3c43511'; // <<< REPLACE WITH GANACHE ACCOUNT PRIVATE KEY
// ******************************************************************

const ganacheRpcUrl = 'http://127.0.0.1:8545'; // Default Ganache RPC URL

window.addEventListener('load', async () => {
    // Connect directly to Ganache RPC
    web3 = new Web3(new Web3.providers.HttpProvider(ganacheRpcUrl));

    try {
        // Get account from private key
        const accountObject = web3.eth.accounts.privateKeyToAccount(privateKey);
        account = accountObject.address;

        // Set the default account for interactions
        web3.eth.defaultAccount = account;

        console.log("Connected directly to RPC.");
        console.log("Using account:", account);

        // Update status display (optional, simplified)
        document.getElementById('connection-status').innerText = 'Connected to RPC';
        document.getElementById('account-address').innerText = account;

        // Load contract ABI and instantiate contract
        loadContract();

    } catch (error) {
        console.error("Failed to connect to RPC or load account:", error);
        document.getElementById('connection-status').innerText = 'Failed to connect';
         document.getElementById('account-address').innerText = 'N/A';
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
             populateVehicleDropdowns();
        } else {
            console.warn("Contract address not set. Cannot instantiate contract. Please deploy the contract and update contractAddress.");
        }

    } catch (e) {
        console.error("Error loading contract artifact:", e);
        document.getElementById('connection-status').innerText = 'Error loading contract';
    }
}

// --- Transaction Sending Helper Function ---
// This function will sign and send transactions manually
async function sendTransaction(method, params, value = 0) {
    if (!contract || !account) {
        console.error("Contract or account not loaded.");
        return;
    }

    try {
        const txObject = {
            from: account,
            to: contract.options.address,
            data: method.encodeABI(...params),
            value: value,
            gas: await method.estimateGas(...params, { from: account, value: value })
        };

        console.log("Sending transaction:", txObject);

        const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
        console.log("Signed transaction:", signedTx);

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction receipt:", receipt);

        return receipt;

    } catch (error) {
        console.error("Transaction failed:", error);
        throw error; // Re-throw to be caught by the calling function
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
        try {
            await sendTransaction(contract.methods.registerVehicle(vehicleIdString, capacity, baseStation), [vehicleIdString, capacity, baseStation]);
            // Refresh vehicle list and dropdowns
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
             alert("Vehicle registered successfully!"); // Simple success feedback
        } catch (error) {
             alert("Error registering vehicle. See console for details.");
        }
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
        try {
            const escrowAmountWei = web3.utils.toWei(escrowAmount, 'ether');
             await sendTransaction(contract.methods.scheduleForwardTrip(vehicleId, origin, destination, cargoWeight), [vehicleId, origin, destination, cargoWeight], escrowAmountWei);
            // Refresh trip list and vehicle dropdowns
            fetchAndDisplayTrips();
            populateVehicleDropdowns();
             alert("Forward trip scheduled successfully!");
        } catch (error) {
             alert("Error scheduling forward trip. See console for details.");
        }
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
         try {
             const escrowAmountWei = web3.utils.toWei(escrowAmount, 'ether');
             await sendTransaction(contract.methods.scheduleReverseTrip(vehicleId, origin, destination, cargoWeight), [vehicleId, origin, destination, cargoWeight], escrowAmountWei);
            // Refresh trip list and vehicle dropdowns
            fetchAndDisplayTrips();
            populateVehicleDropdowns();
             alert("Reverse trip scheduled successfully!");
         } catch (error) {
             alert("Error scheduling reverse trip. See console for details.");
         }
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Assign Vehicle to Reverse Trip
document.getElementById('admin-assign-reverse-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-assign-reverse-trip-id').value;

     if (contract) {
         try {
            await sendTransaction(contract.methods.assignVehicleToReverseTrip(tripId), [tripId]);
             // Refresh trip list and vehicle dropdowns
            fetchAndDisplayTrips();
            populateVehicleDropdowns();
             alert("Vehicle assigned to reverse trip successfully!");
         } catch (error) {
             alert("Error assigning vehicle to reverse trip. See console for details.");
         }
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
        try {
             if (ipfsHash) {
                 await sendTransaction(contract.methods.markReverseTripDelivered(tripId, ipfsHash), [tripId, ipfsHash]);
             } else {
                 await sendTransaction(contract.methods.markForwardTripDelivered(tripId), [tripId]);
             }

            // Refresh trip list and vehicle list/dropdowns
            fetchAndDisplayTrips();
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
             alert("Trip marked delivered successfully!");

        } catch (error) {
            alert("Error marking trip delivered. See console for details.");
        }
    } else {
        console.error("Contract not loaded.");
    }
});

// --- Functions to Fetch and Display Data ---

async function fetchAndDisplayVehicles() {
    if (!contract) return;
    console.log("Fetching vehicles...");
    const vehicleListDiv = document.getElementById('vehicle-list');
    vehicleListDiv.innerHTML = ''; // Clear current list
    try {

        console.log("Calling getAllVehicleUintIds...");
        const allVehicleUintIds = await contract.methods.getAllVehicleUintIds().call();
        console.log("Received vehicle IDs:", allVehicleUintIds);

        if (!allVehicleUintIds || allVehicleUintIds.length === 0) { // Added check for null/undefined
            vehicleListDiv.innerHTML = '<p>No vehicles registered yet.</p>';
            console.log("No vehicles found.");
            return;
        }

        console.log("Iterating through vehicle IDs...");
        for (const uintId of allVehicleUintIds) {
            console.log("Fetching vehicle with ID:", uintId);
            const vehicle = await contract.methods.getVehicle(uintId).call();
            console.log("Received vehicle:", vehicle);

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
    const forwardTripListDiv = document.getElementById('forward-trip-list');
    const reverseTripListDiv = document.getElementById('reverse-trip-list');
    forwardTripListDiv.innerHTML = ''; // Clear current list
    reverseTripListDiv.innerHTML = ''; // Clear current list
    try {
        console.log("Calling getAllTripIds...");
        const allTripIds = await contract.methods.getAllTripIds().call();
        console.log("Received trip IDs:", allTripIds);

         if (!allTripIds || allTripIds.length === 0) { // Added check for null/undefined
            forwardTripListDiv.innerHTML = '<p>No forward trips scheduled yet.</p>';
            reverseTripListDiv.innerHTML = '<p>No reverse trips scheduled yet.</p>';
             console.log("No trips found.");
            return;
        }

        console.log("Iterating through trip IDs...");
        for (const tripId of allTripIds) {
             console.log("Fetching trip with ID:", tripId);
            const trip = await contract.methods.getTrip(tripId).call();
            console.log("Received trip:", trip);

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
        forwardTripListDiv.innerHTML = '<p>Error loading trips.';
        reverseTripListDiv.innerHTML = '<p>Error loading trips.';
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

        if (!allVehicleUintIds || allVehicleUintIds.length === 0) { // Added check for null/undefined
             console.log("No vehicles found for dropdown population.");
            return;
        }

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
            // Note: In this wallet-less setup, we assume the hardcoded account is the owner
            // and can perform all actions, including reverse scheduling after forward.
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
    // Web3 connection and contract loading now handled directly
    // Initial data load is called in loadContract
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
            // Also check if the last trip is indeed the one that put the vehicle in DeliveredForward state
            if (lastTrip.isForward && lastTrip.deliveryState == getDeliveryStateEnum('DeliveredForward') && vehicle.state == getDeliveryStateEnum('DeliveredForward')) {
                reverseOriginInput.value = lastTrip.destination;
            }
        }

    } catch (error) {
        console.error("Error fetching vehicle for reverse origin autofill:", error);
    }
}); 