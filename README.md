# Forex Sprint

> **Gamified DEX Arbitrage on Celo, built for MiniPay.**

**Forex Sprint** is a mobile-first, gamified DeFi application built specifically for the MiniPay ecosystem on Celo. It transforms the highly technical concept of "DEX arbitrage" (profiting from price differences of the same asset across different exchanges) into an accessible, idle-management game.

Users deposit pocket change (as little as $1 in stablecoins), configure a cute "Agent Bot" with simple rules, and let the bot autonomously hunt for profit across Celo's decentralized exchanges (like Uniswap and Ubeswap). By combining Celo's sub-cent transaction fees with MiniPay's frictionless onboarding, Forex Sprint democratizes algorithmic trading for the Global South.

---

## 🏗️ Architecture

To make the app feel like a game while functioning as a secure financial product, the architecture is split into three layers:

### 1. The Smart Contract Layer (The Vault)
Located in `apps/contracts/`.
* Users deposit funds into a UUPS Upgradeable `ForexSprintVault` smart contract.
* The contract strictly enforces profitability: an arbitrage execution is only successful if the returned balance is greater than the initial balance plus the user's minimum expected profit. No funds can be extracted by malicious paths.
* Execution is routed through a transient `ArbitrageExecutor` contract.

### 2. The Off-Chain Engine (The Solver)
Located in `apps/solver/`.
* A centralized Node.js worker built with `viem` that continuously polls Uniswap V3 and Ubeswap for price discrepancies (e.g., between USDm and USDC).
* When a profitable route matching a user's bot parameters is found, it dispatches the `executeArbitrage` transaction to the Vault.

### 3. The Frontend (MiniPay App)
Located in `apps/web/`.
* A lightweight Next.js app optimized for Opera Mini, built with a **Monochrome Developer Terminal Aesthetic**.
* Uses `viem` and `wagmi` for implicit wallet connections inside MiniPay.
* Implements **Celo Fee Abstraction**, allowing users to pay gas in stablecoins (USDm) natively without needing CELO.

---

## 🛠️ Technology Stack

* **Blockchain:** Celo (Mainnet & Celo Sepolia Testnet)
* **Frontend:** Next.js 14, React, Tailwind CSS (Terminal Theme), shadcn/ui
* **Web3 Library:** `viem`, `wagmi`, RainbowKit
* **Smart Contracts:** Solidity ^0.8.20, Foundry, OpenZeppelin (UUPS Upgradeable)
* **Solver Engine:** Node.js, `viem`
* **Key Protocols:** Uniswap V3, Ubeswap, Mento (Regional Stablecoins)

---

## 🚀 Getting Started

### Prerequisites
* Node.js v20+
* Foundry (`forge`, `cast`, `anvil`)
* PNPM package manager

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Smart Contracts
```bash
cd apps/contracts
# Install submodules
forge install
# Compile contracts
forge build
# Run local fork tests
forge test
```

To deploy to a local Anvil node (forking Celo mainnet):
```bash
# Terminal 1: Start Anvil
anvil --fork-url https://forno.celo.org

# Terminal 2: Deploy Contracts & Sync ABI to Frontend
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --ffi
```

### 3. Web Frontend
```bash
cd apps/web
# Start Next.js development server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000). To test in MiniPay, use Ngrok (`ngrok http 3000`) and open the URL in the MiniPay Developer mode.

### 4. Solver Engine
```bash
cd apps/solver
# Create .env with SOLVER_PRIVATE_KEY, VAULT_ADDRESS, EXECUTOR_ADDRESS
# Run the scanner
pnpm dlx ts-node index.ts
```

---

## 📄 License

This project is licensed under the MIT License.
