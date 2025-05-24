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
        // We assume the artifact is in the build/contracts directory after truffle compile
        const response = await fetch('./build/contracts/FreightManager.json');
        const artifact = await response.json();
        contractABI = artifact.abi;

        // Check if contractAddress is set before instantiating
        if (contractAddress !== 'YOUR_CONTRACT_ADDRESS') {
             contract = new web3.eth.Contract(contractABI, contractAddress);
             console.log("Contract loaded:", contract);
             // You can now interact with the contract
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
    const capacity = document.getElementById('vehicle-capacity').value;
    if (contract) {
        await registerVehicle(capacity);
    } else {
        console.error("Contract not loaded.");
    }
});

// Forward Trip Scheduling
document.getElementById('schedule-forward-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const origin = document.getElementById('forward-origin').value;
    const destination = document.getElementById('forward-destination').value;
    const cargoWeight = document.getElementById('forward-cargo-weight').value;
    const escrowAmount = document.getElementById('forward-escrow').value;

    if (contract) {
        const escrowAmountWei = web3.utils.toWei(escrowAmount, 'ether');
        await scheduleForwardTrip(origin, destination, cargoWeight, escrowAmountWei);
    } else {
        console.error("Contract not loaded.");
    }
});

// Assign Vehicle to Forward Trip
document.getElementById('assign-forward-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('assign-forward-trip-id').value;
    const vehicleId = document.getElementById('assign-forward-vehicle-id').value;
    if (contract) {
        await assignVehicleToForwardTrip(tripId, vehicleId);
    } else {
        console.error("Contract not loaded.");
    }
});

// Mark Forward Trip Delivered
document.getElementById('mark-forward-delivered-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('mark-forward-trip-id').value;
    if (contract) {
        await markForwardTripDelivered(tripId);
    } else {
        console.error("Contract not loaded.");
    }
});

// Schedule Reverse Trip
document.getElementById('schedule-reverse-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicleId = document.getElementById('reverse-vehicle-id').value;
    const origin = document.getElementById('reverse-origin').value;
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

// Assign Vehicle to Reverse Trip
document.getElementById('assign-reverse-trip-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('assign-reverse-trip-id').value;
    const vehicleId = document.getElementById('assign-reverse-vehicle-id').value;
     if (contract) {
        await assignVehicleToReverseTrip(tripId, vehicleId);
    } else {
        console.error("Contract not loaded.");
    }
});

// Mark Reverse Trip Delivered
document.getElementById('mark-reverse-delivered-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const tripId = document.getElementById('mark-reverse-trip-id').value;
    const ipfsHash = document.getElementById('reverse-ipfs-hash').value;
    if (contract) {
        await markReverseTripDelivered(tripId, ipfsHash);
    } else {
        console.error("Contract not loaded.");
    }
});


// --- Functions to Interact with Contract ---

async function registerVehicle(capacity) {
    console.log("Attempting to register vehicle with capacity:", capacity);
    try {
        const result = await contract.methods.registerVehicle(capacity).send({ from: accounts[0] });
        console.log("Vehicle registered:", result);
        // TODO: Update UI with success message or vehicle details
    } catch (error) {
        console.error("Error registering vehicle:", error);
        // TODO: Display error message in UI
    }
}

async function scheduleForwardTrip(origin, destination, cargoWeight, escrowAmountWei) {
    console.log("Attempting to schedule forward trip...");
    try {
        const result = await contract.methods.scheduleForwardTrip(origin, destination, cargoWeight).send({
            from: accounts[0],
            value: escrowAmountWei // Send escrow amount with the transaction
        });
        console.log("Forward trip scheduled:", result);
        // TODO: Update UI with success message or trip details
    } catch (error) {
        console.error("Error scheduling forward trip:", error);
        // TODO: Display error message in UI
    }
}

async function assignVehicleToForwardTrip(tripId, vehicleId) {
     console.log(`Attempting to assign vehicle ${vehicleId} to forward trip ${tripId}...`);
    try {
        const result = await contract.methods.assignVehicleToForwardTrip(tripId, vehicleId).send({ from: accounts[0] });
        console.log("Vehicle assigned to forward trip:", result);
        // TODO: Update UI with success message or updated trip/vehicle details
    } catch (error) {
        console.error("Error assigning vehicle to forward trip:", error);
        // TODO: Display error message in UI
    }
}

async function markForwardTripDelivered(tripId) {
     console.log(`Attempting to mark forward trip ${tripId} as delivered...`);
    try {
        const result = await contract.methods.markForwardTripDelivered(tripId).send({ from: accounts[0] });
        console.log("Forward trip marked delivered:", result);
        // TODO: Update UI with success message or updated trip/vehicle details
    } catch (error) {
        console.error("Error marking forward trip delivered:", error);
        // TODO: Display error message in UI
    }
}

async function scheduleReverseTrip(vehicleId, origin, destination, cargoWeight, escrowAmountWei) {
     console.log(`Attempting to schedule reverse trip for vehicle ${vehicleId} from ${origin} to ${destination}...`);
    try {
        const result = await contract.methods.scheduleReverseTrip(vehicleId, origin, destination, cargoWeight).send({
            from: accounts[0],
            value: escrowAmountWei // Send escrow amount with the transaction
        });
        console.log("Reverse trip scheduled:", result);
        // TODO: Update UI with success message or trip details
    } catch (error) {
        console.error("Error scheduling reverse trip:", error);
        // TODO: Display error message in UI
    }
}

async function assignVehicleToReverseTrip(tripId, vehicleId) {
    console.log(`Attempting to assign vehicle ${vehicleId} to reverse trip ${tripId}...`);
    try {
        const result = await contract.methods.assignVehicleToReverseTrip(tripId, vehicleId).send({ from: accounts[0] });
        console.log("Vehicle assigned to reverse trip:", result);
        // TODO: Update UI with success message or updated trip/vehicle details
    } catch (error) {
        console.error("Error assigning vehicle to reverse trip:", error);
        // TODO: Display error message in UI
    }
}

async function markReverseTripDelivered(tripId, ipfsHash) {
    console.log(`Attempting to mark reverse trip ${tripId} as delivered with IPFS hash ${ipfsHash}...`);
    try {
        const result = await contract.methods.markReverseTripDelivered(tripId, ipfsHash).send({ from: accounts[0] });
        console.log("Reverse trip marked delivered:", result);
        // TODO: Update UI with success message, escrow release confirmation, or updated trip/vehicle details
    } catch (error) {
        console.error("Error marking reverse trip delivered:", error);
        // TODO: Display error message in UI
    }
} 