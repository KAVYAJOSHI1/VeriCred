// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVerifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata public_inputs
    ) public pure returns (bool) {
        return true;
    }
}
