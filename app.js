let web3;
let account; // Use a single account for transactions in this wallet-less setup
let contract;

// The contract address and ABI
const contractAddress = '0x79FfddE658E6BE4241B4F797ed3BB69851e3dc57'; // Updated deployed contract address
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

// Admin: Mark Forward Trip Delivered
document.getElementById('admin-mark-forward-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-mark-forward-trip-id').value;
    if (contract) {
        try {
            await sendTransaction(contract.methods.markForwardTripDelivered(tripId), [tripId]);
            fetchAndDisplayTrips();
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
            alert("Forward trip marked delivered successfully!");
        } catch (error) {
            alert("Error marking forward trip delivered. See console for details.");
        }
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Mark Reverse Trip Delivered
document.getElementById('admin-mark-reverse-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-mark-reverse-trip-id').value;
    const ipfsHash = document.getElementById('admin-mark-reverse-ipfs-hash').value;
    if (contract) {
        try {
            await sendTransaction(contract.methods.markReverseTripDelivered(tripId, ipfsHash), [tripId, ipfsHash]);
            fetchAndDisplayTrips();
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
            alert("Reverse trip marked delivered successfully!");
        } catch (error) {
            alert("Error marking reverse trip delivered. See console for details.");
        }
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Start Forward Trip
// Listen for admin start forward trip form submission
// (new code)
document.getElementById('admin-start-forward-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-start-forward-trip-id').value;
    if (contract) {
        try {
            await sendTransaction(contract.methods.assignVehicleToForwardTrip(tripId), [tripId]);
            fetchAndDisplayTrips();
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
            alert("Forward trip started (in transit) successfully!");
        } catch (error) {
            alert("Error starting forward trip. See console for details.");
        }
    } else {
        console.error("Contract not loaded.");
    }
});

// Admin: Start Reverse Trip
// Listen for admin start reverse trip form submission
// (new code)
document.getElementById('admin-start-reverse-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('admin-start-reverse-trip-id').value;
    if (contract) {
        try {
            await sendTransaction(contract.methods.assignVehicleToReverseTrip(tripId), [tripId]);
            fetchAndDisplayTrips();
            fetchAndDisplayVehicles();
            populateVehicleDropdowns();
            alert("Reverse trip started (in transit) successfully!");
        } catch (error) {
            alert("Error starting reverse trip. See console for details.");
        }
    } else {
        console.error("Contract not loaded.");
    }
});

// --- Functions to Fetch and Display Data ---

// Helper function to render vehicle table rows in all locations
function renderVehicleTables(vehicles) {
    const tableIds = [
        'vehicle-list-admin'
    ];
    for (const id of tableIds) {
        const tbody = document.getElementById(id);
        if (!tbody) continue;
        tbody.innerHTML = '';
        if (vehicles.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="text-center text-muted">No vehicles registered yet.</td>`;
            tbody.appendChild(tr);
            continue;
        }
        for (const vehicle of vehicles) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${vehicle.vehicleIdString} <span class="text-muted small">(ID: ${vehicle.id})</span></td>
                <td>${vehicle.capacity}</td>
                <td>${vehicle.baseStation}</td>
                <td><span class="badge badge-state bg-${getStateColor(vehicle.state)}">${getDeliveryStateString(vehicle.state)}</span></td>
                <td>${vehicle.tripHistory && vehicle.tripHistory.length > 0 ? vehicle.tripHistory.join(', ') : '<span class="text-muted">None</span>'}</td>
            `;
            tbody.appendChild(tr);
        }
    }
}

// Helper to get color for state badge
function getStateColor(stateIndex) {
    // 0:Available, 1:AssignedForward, 2:InTransitForward, 3:DeliveredForward, 4:AssignedReverse, 5:InTransitReverse, 6:DeliveredReverse
    switch (stateIndex) {
        case 0: return 'info'; // Available
        case 1: return 'warning'; // AssignedForward
        case 2: return 'primary'; // InTransitForward
        case 3: return 'success'; // DeliveredForward
        case 4: return 'warning'; // AssignedReverse
        case 5: return 'primary'; // InTransitReverse
        case 6: return 'success'; // DeliveredReverse
        default: return 'secondary';
    }
}

// Update fetchAndDisplayVehicles to use the new helper
async function fetchAndDisplayVehicles() {
    if (!contract) return;
    console.log("Fetching vehicles...");
    try {
        const allVehicleUintIds = await contract.methods.getAllVehicleUintIds().call();
        console.log("Received vehicle IDs:", allVehicleUintIds);
        let vehicles = [];
        if (!allVehicleUintIds || allVehicleUintIds.length === 0) {
            renderVehicleTables([]);
            console.log("No vehicles found.");
            return;
        }
        for (const uintId of allVehicleUintIds) {
            const vehicle = await contract.methods.getVehicle(uintId).call();
            vehicles.push(vehicle);
        }
        renderVehicleTables(vehicles);
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        renderVehicleTables([]);
    }
}

// Helper function to populate admin dropdowns for marking trips delivered
async function populateAdminTripDropdowns() {
    if (!contract) return;
    try {
        const forwardStartSelect = document.getElementById('admin-start-forward-trip-id');
        const forwardMarkSelect = document.getElementById('admin-mark-forward-trip-id');
        const reverseStartSelect = document.getElementById('admin-start-reverse-trip-id');
        const reverseMarkSelect = document.getElementById('admin-mark-reverse-trip-id');
        forwardStartSelect.innerHTML = '<option value="">--Select Forward Trip--</option>';
        forwardMarkSelect.innerHTML = '<option value="">--Select Forward Trip--</option>';
        reverseStartSelect.innerHTML = '<option value="">--Select Reverse Trip--</option>';
        reverseMarkSelect.innerHTML = '<option value="">--Select Reverse Trip--</option>';

        const allTripIds = await contract.methods.getAllTripIds().call();
        for (const tripId of allTripIds) {
            const trip = await contract.methods.getTrip(tripId).call();
            // Forward trips in AssignedForward state (for starting)
            if (trip.isForward && trip.deliveryState == getDeliveryStateEnum('AssignedForward')) {
                const option = document.createElement('option');
                option.value = trip.id;
                option.innerText = `Trip #${trip.id} | Vehicle: ${trip.vehicleId} | ${trip.origin} → ${trip.destination}`;
                forwardStartSelect.appendChild(option);
            }
            // Forward trips in InTransitForward state (for marking delivered)
            if (trip.isForward && trip.deliveryState == getDeliveryStateEnum('InTransitForward')) {
                const option = document.createElement('option');
                option.value = trip.id;
                option.innerText = `Trip #${trip.id} | Vehicle: ${trip.vehicleId} | ${trip.origin} → ${trip.destination}`;
                forwardMarkSelect.appendChild(option);
            }
            // Reverse trips in AssignedReverse state (for starting)
            if (!trip.isForward && trip.deliveryState == getDeliveryStateEnum('AssignedReverse')) {
                const option = document.createElement('option');
                option.value = trip.id;
                option.innerText = `Trip #${trip.id} | Vehicle: ${trip.vehicleId} | ${trip.origin} → ${trip.destination}`;
                reverseStartSelect.appendChild(option);
            }
            // Reverse trips in InTransitReverse state (for marking delivered)
            if (!trip.isForward && trip.deliveryState == getDeliveryStateEnum('InTransitReverse')) {
                const option = document.createElement('option');
                option.value = trip.id;
                option.innerText = `Trip #${trip.id} | Vehicle: ${trip.vehicleId} | ${trip.origin} → ${trip.destination}`;
                reverseMarkSelect.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Error populating admin trip dropdowns:', error);
    }
}

// Helper to render forward and reverse trip tables
function renderForwardTripTable(trips) {
    const tbody = document.getElementById('forward-trip-list-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!trips || trips.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" class="text-center text-muted">No forward trips scheduled yet.</td>`;
        tbody.appendChild(tr);
        return;
    }
    for (const trip of trips) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${trip.id}</td>
            <td>${trip.vehicleId}</td>
            <td>${trip.origin}</td>
            <td>${trip.destination}</td>
            <td>${trip.cargoWeight}</td>
            <td><span class="text-truncate" style="max-width:120px;display:inline-block;" title="${trip.user}">${trip.user}</span></td>
            <td>${web3.utils.fromWei(trip.escrowAmount, 'ether')} ETH</td>
            <td><span class="badge badge-state bg-${getStateColor(trip.deliveryState)}">${getDeliveryStateString(trip.deliveryState)}</span></td>
        `;
        tbody.appendChild(tr);
    }
}

function renderReverseTripTable(trips) {
    const tbody = document.getElementById('reverse-trip-list-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!trips || trips.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="9" class="text-center text-muted">No reverse trips scheduled yet.</td>`;
        tbody.appendChild(tr);
        return;
    }
    for (const trip of trips) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${trip.id}</td>
            <td>${trip.vehicleId}</td>
            <td>${trip.origin}</td>
            <td>${trip.destination}</td>
            <td>${trip.cargoWeight}</td>
            <td><span class="text-truncate" style="max-width:120px;display:inline-block;" title="${trip.user}">${trip.user}</span></td>
            <td>${web3.utils.fromWei(trip.escrowAmount, 'ether')} ETH</td>
            <td><span class="badge badge-state bg-${getStateColor(trip.deliveryState)}">${getDeliveryStateString(trip.deliveryState)}</span></td>
            <td>${trip.ipfsHash ? trip.ipfsHash : '<span class="text-muted">N/A</span>'}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Update fetchAndDisplayTrips to use the new helpers
async function fetchAndDisplayTrips() {
    if (!contract) return;
    console.log("Fetching trips...");
    let forwardTrips = [];
    let reverseTrips = [];
    try {
        const allTripIds = await contract.methods.getAllTripIds().call();
        if (!allTripIds || allTripIds.length === 0) {
            renderForwardTripTable([]);
            renderReverseTripTable([]);
            await populateAdminTripDropdowns();
            return;
        }
        for (const tripId of allTripIds) {
            const trip = await contract.methods.getTrip(tripId).call();
            if (trip.isForward) {
                forwardTrips.push(trip);
            } else {
                reverseTrips.push(trip);
            }
        }
        renderForwardTripTable(forwardTrips);
        renderReverseTripTable(reverseTrips);
        await populateAdminTripDropdowns();
    } catch (error) {
        console.error("Error fetching trips:", error);
        renderForwardTripTable([]);
        renderReverseTripTable([]);
        await populateAdminTripDropdowns();
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
    const states = ["Available", "AssignedForward", "InTransitForward", "DeliveredForward", "AssignedReverse", "InTransitReverse", "DeliveredReverse"];
    return states[stateIndex];
}

// Helper function to get DeliveryState enum index from string
function getDeliveryStateEnum(stateString) {
    const states = {"Available": 0, "AssignedForward": 1, "InTransitForward": 2, "DeliveredForward": 3, "AssignedReverse": 4, "InTransitReverse": 5, "DeliveredReverse": 6};
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
