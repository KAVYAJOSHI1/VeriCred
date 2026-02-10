const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
    console.log("🚀 Starting Manual On-Chain Verification...");

    // 1. Read Proof JSON
    const proofPath = path.resolve(__dirname, '../../proof.json');
    if (!fs.existsSync(proofPath)) {
        console.error(`❌ proof.json not found at ${proofPath}`);
        process.exit(1);
    }

    console.log(`📖 Reading proof from ${proofPath}...`);
    const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));

    const hexProof = proofData.hex_proof;
    const instancesLE = proofData.instances[0]; // Little Endian instances as strings

    console.log("   Proof Length (Bytes):", (hexProof.length - 2) / 2);
    console.log("   Instances (Raw LE):", instancesLE);

    // 2. Format Instances
    // Convert Little Endian hex string to Big Endian BigInt/Hex
    const instancesBE = instancesLE.map(inst => {
        // inst is hex string without 0x (or with? checks file)
        // File says "ef0e00..." (no 0x)
        let hex = inst.startsWith('0x') ? inst.slice(2) : inst;

        // Reverse bytes
        let reversed = "";
        for (let i = 0; i < hex.length; i += 2) {
            reversed = hex.slice(i, i + 2) + reversed;
        }

        return "0x" + reversed;
    });

    console.log("   Instances (Formatted BE):", instancesBE);

    // 3. Connect to Contract
    const VERIFIER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    console.log(`\n🔗 Connecting to Verifier at ${VERIFIER_ADDRESS}...`);

    try {
        const Verifier = await hre.ethers.getContractFactory("Halo2Verifier");
        const verifier = Verifier.attach(VERIFIER_ADDRESS);

        // 4. Verify
        console.log("   Calling verifyProof...");

        // Try static call
        try {
            const result = await verifier.verifyProof.staticCall(hexProof, instancesBE);
            console.log("   Static Call Result:", result);

            if (result) {
                console.log("✅ ON-CHAIN VERIFICATION PASSED!");
            } else {
                console.error("❌ ON-CHAIN VERIFICATION FAILED (returned false)");
            }
        } catch (e) {
            console.log("   Static call reverted. Error:", e.reason || e.message);
            // Try actual tx to see if it reverts similarly
            // console.error(e);
        }

    } catch (error) {
        console.error("❌ Blockchain Error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
