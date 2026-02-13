const hre = require("hardhat");
const { expect } = require("chai");

async function main() {
    console.log("Starting verification flow...");

    // 1. Deploy Contract
    console.log("Deploying Halo2Verifier...");
    const Verifier = await hre.ethers.getContractFactory("Halo2Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log(`Halo2Verifier deployed to: ${verifierAddress}`);

    // 2. Define Inputs for Backend
    const inputData = {
        age: 30,
        income: 50000,
        debt: 2000,
        history: 5,
        open_acc: 3
    };

    // 3. Submit Job to Backend
    console.log("Submitting job to backend at http://localhost:8000/generate-proof...");
    let jobId;
    try {
        const response = await fetch('http://localhost:8000/generate-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputData)
        });

        if (!response.ok) {
            throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        jobId = data.id;
        console.log(`Job ID received: ${jobId}`);
    } catch (error) {
        console.error("Failed to connect to backend. Is it running on port 8000?");
        console.error(error);
        process.exit(1);
    }

    // 4. Poll for Completion
    console.log("Polling for proof generation...");
    let proof = null;
    let publicInstances = [];

    // Poll loop
    for (let i = 0; i < 300; i++) { // Max 10 minutes
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s

        try {
            const res = await fetch(`http://localhost:8000/requests/${jobId}`);
            if (!res.ok) continue;

            const statusData = await res.json();
            console.log(`Status: ${statusData.status}`);

            if (statusData.status === 'Completed') {
                proof = statusData.proof;
                if (statusData.public_instances) {
                    publicInstances = statusData.public_instances;
                    console.log(`Public Instances: ${JSON.stringify(publicInstances)}`);
                }
                console.log("Proof received!");
                break;
            } else if (statusData.status === 'Failed') {
                console.error("Proof generation failed!");
                process.exit(1);
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    }

    if (!proof) {
        console.error("Timeout: Proof generation took too long.");
        process.exit(1);
    }

    // 5. Verify On-Chain
    console.log("Verifying proof on-chain...");
    // Format proof: '0x' + proof
    const formattedProof = proof.startsWith('0x') ? proof : `0x${proof}`;

    // Use the public instances we got from backend
    const instances = publicInstances;

    try {
        const tx = await verifier.verifyProof(formattedProof, instances);
        // Sometimes verifyProof is a view function or returns a bool, sometimes it reverts on failure.
        // If it's a non-view function (transaction), we wait for receipt.
        // If it's view, we get result immediately.
        // Let's check if we can call safely.

        // Usually verifyProof in Halo2 solidity export is a public function that returns bool.
        // We can use `staticCall` to check the result without mining a tx.
        const result = await verifier.verifyProof.staticCall(formattedProof, instances);

        if (result) {
            console.log("✅ Verification SUCCESS!");
        } else {
            console.error("❌ Verification FAILED (returned false).");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Verification FAILED with error:");
        console.error(error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
