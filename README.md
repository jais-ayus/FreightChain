# FreightChain

FreightChain is a blockchain-based freight logistics platform built on Ethereum. It enables secure, transparent vehicle registration, forward and reverse trip scheduling, vehicle assignment, trip execution, escrow management, and admin controls—all through a modern web interface.

## Features
- **Vehicle Registration**: Register vehicles with unique IDs, capacity, and base station.
- **Forward & Reverse Trip Scheduling**: Schedule trips for available vehicles, with clear state transitions and admin workflow.
- **Escrow Management**: Secure payments for each trip using smart contract escrow.
- **Admin Controls**: Start trips, mark deliveries, and manage workflow from a dedicated admin page.
- **Modern UI**: Responsive, professional SPA with Bootstrap, color-coded tables, and clear navigation.

## Tech Stack
- **Smart Contracts**: Solidity, Truffle
- **Local Blockchain**: Ganache
- **Frontend**: HTML, Bootstrap 5, JavaScript (Web3.js)

## Setup Instructions

### 1. Prerequisites
- [Node.js & npm](https://nodejs.org/)
- [Truffle](https://trufflesuite.com/truffle/) (`npm install -g truffle`)
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI)

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd web3
```

### 3. Start Ganache
- Open Ganache GUI or run `ganache-cli`.
- Use the default RPC URL: `http://127.0.0.1:8545`.
- Copy a private key from one of the Ganache accounts (for use in the frontend).

### 4. Compile and Deploy the Smart Contract
```bash
npx truffle compile
npx truffle migrate --reset
```
- Note the deployed contract address from the migration output.

### 5. Configure the Frontend
- In `app.js`, set:
  - `const contractAddress = '<your-deployed-contract-address>';`
  - `const privateKey = '<your-ganache-account-private-key>';`
- Make sure the RPC URL matches your Ganache instance.

### 6. Run the Frontend
You can use any static server. For example:
```bash
npx serve .
```
Or open `index.html` directly in your browser (if CORS allows).

## Working with a Test Branch

If you want to experiment or develop features without affecting the main codebase, use a test branch:

### 1. Create and Switch to a Test Branch
```bash
git checkout -b test
```

### 2. Make Your Changes
- Edit files, add features, or run tests as needed.

### 3. Commit and Push the Test Branch
```bash
git add .
git commit -m "Your message about the changes"
git push origin test
```

### 4. Switch Between Branches
```bash
git checkout main      # Switch to main branch
git checkout test      # Switch back to test branch
```

### 5. Merge Test Branch into Main (when ready)
```bash
git checkout main
git pull origin main
git merge test
git push origin main
```

> **Tip:** Always pull the latest changes from remote before merging to avoid conflicts.

## Usage Guide
1. **Register Vehicles**: Go to the Vehicle Registration page and add vehicles.
2. **Schedule Forward Trips**: On the Forward Scheduling page, select an available vehicle and schedule a trip.
3. **Admin Actions**: Use the Admin page to start trips and mark them as delivered.
4. **Schedule Reverse Trips**: After a forward trip is delivered, schedule a reverse trip for the same vehicle.
5. **Monitor State**: All vehicles and trips are shown in professional tables with color-coded states.

## Troubleshooting
- **Transactions not showing in Ganache UI?**
  - Ensure the private key in `app.js` is from a Ganache account.
  - Check the "Blocks" and "Transactions" tabs in Ganache UI.
  - Make sure the RPC URL matches between Ganache and your DApp.
- **Contract not found?**
  - Double-check the contract address in `app.js` after each deployment.
- **UI not updating?**
  - Refresh the browser. Check the browser console for errors.
- **MetaMask not required**: This DApp uses direct RPC and a hardcoded private key for local testing.

## Project Structure
```
web3/
  contracts/              # Solidity smart contracts
  migrations/             # Truffle migration scripts
  test/                   # (Optional) Truffle tests
  build/contracts/        # Compiled contract artifacts
  app.js                  # Main frontend JS logic
  index.html              # Main frontend UI
  truffle-config.js       # Truffle config
```

## License
MIT 