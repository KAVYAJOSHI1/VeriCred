const hre = require("hardhat");

async function main() {
    const Verifier = await hre.ethers.getContractFactory("Halo2Verifier");
    const verifier = await Verifier.deploy();

    await verifier.waitForDeployment();

    console.log("Verifier deployed to:", await verifier.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
