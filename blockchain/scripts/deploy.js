const hre = require("hardhat");

async function main() {
    const Verifier = await hre.ethers.getContractFactory("Halo2Verifier");
    const verifier = await Verifier.deploy();

    await verifier.waitForDeployment();

    console.log("Verifier deployed to:", await verifier.getAddress());

    // Save address to frontend
    const fs = require("fs");
    const path = require("path");
    const deploymentPath = path.join(__dirname, "../../frontend/src/deployment.json");
    const deploymentData = {
        verifierAddress: await verifier.getAddress()
    };
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log(`Address saved to ${deploymentPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
