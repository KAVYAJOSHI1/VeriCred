# VeriCred - Zero-Knowledge Credit Scoring System

**VeriCred** is a privacy-first application that allows users to generate a verifiable proof of their creditworthiness using Zero-Knowledge Machine Learning (ZKML), without ever revealing their sensitive financial data on-chain.

![Status](https://img.shields.io/badge/Status-POC-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 Key Features

*   **Privacy-Preserving**: Financial data (Income, Debt, Age) never leaves the user's device/backend in plain text.
*   **ZK-SNARKs**: Uses **EZKL** and **Halo2** to generate cryptographic proofs that a credit score computation was performed correctly.
*   **On-Chain Verification**: Smart contract (`Halo2Verifier`) verifies the proof on the Ethereum/Sepolia blockchain.
*   **Tamper-Proof**: The credit score model is committed on-chain; any deviation invalidates the proof.

## 🏗 Architecture

1.  **AI Model (`/ai`)**: A PyTorch Neural Network trained on credit data and exported to ONNX.
2.  **ZK Circuits (`/zk-circuit`)**: The ONNX model is converted into a Halo2 circuit using EZKL.
3.  **Backend (`/backend`)**: FastAPI server that handles proof generation and stores request history in SQLite.
4.  **Blockchain (`/blockchain`)**: Hardhat project containing the Verifier contract.
5.  **Frontend (`/frontend`)**: Next.js & Tailwind CSS interface for users to interact with the system.

## 🚀 Quick Start

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   Metamask Wallet

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/KAVYAJOSHI1/VeriCred.git
cd VeriCred

# Install dependencies (Automated script recommended, or manual below)
npm install
```

### 2. Run Local Environment

You need 4 terminal instances:

**Terminal 1: Blockchain Node**
```bash
cd blockchain
npx hardhat node
```

**Terminal 2: Deploy Contracts**
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
# Copy the deployed address if it changes from default
```

**Terminal 3: Backend Server**
```bash
# Set up Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run Server
python3 backend/main.py
```

**Terminal 4: Frontend**
```bash
cd frontend
npm run dev
```

### 3. Usage
1.  Open [http://localhost:3000](http://localhost:3000).
2.  Connect your Wallet (use Hardhat test account).
3.  Enter arbitrary financial data.
4.  Click **Generate Proof**.
5.  Once generated, click **Verify On-Chain**.
6.  Watch the transaction confirm and the status update!

## 🛠 Tech Stack
*   **ZKML**: [EZKL](https://ezkl.xyz/), Halo2
*   **Blockchain**: Hardhat, Solidity, Ethers.js
*   **Backend**: Python, FastAPI, SQLite
*   **Frontend**: Next.js 14, Tailwind CSS, RainbowKit, Wagmi

## 📄 License
This project is open source and available under the MIT License.
