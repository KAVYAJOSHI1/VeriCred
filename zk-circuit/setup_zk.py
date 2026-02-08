import ezkl
import os
import json
import torch
import numpy as np

# Paths
model_path = "ai/credit_model.onnx"
compiled_model_path = "zk-circuit/model.ezkl"
pk_path = "zk-circuit/key.pk"
vk_path = "zk-circuit/key.vk"
settings_path = "zk-circuit/settings.json"
data_path = "zk-circuit/input.json"
verifier_path = "blockchain/contracts/Verifier.sol"

import asyncio
import nest_asyncio
nest_asyncio.apply()

async def main():
    # Make sure directories exist
    os.makedirs("zk-circuit", exist_ok=True)
    os.makedirs("blockchain/contracts", exist_ok=True)

    print("Generating settings...")
    # Define visibility settings
    # Model weights: Fixed (Public)
    # Input data: Private (User's financial data)
    # Output: Public (The credit score)
    run_args = ezkl.PyRunArgs()
    run_args.input_visibility = "private"
    run_args.output_visibility = "public"
    run_args.param_visibility = "fixed"
    
    # Generate initial settings
    # Note: gen_settings might also be async in some versions, check if await needed
    res = ezkl.gen_settings(model_path, settings_path, py_run_args=run_args)
    if asyncio.iscoroutine(res):
        await res
    
    print("Calibrating settings...")
    # Create dummy data for calibration
    # Input shape is (1, 5) based on train.py
    shape = [1, 5]
    data_array = np.random.rand(*shape).astype(np.float32)
    # EZKL expects input_data as a list of flattened lists (one per input)
    data = dict(input_data=[data_array.flatten().tolist()])
    
    with open(data_path, "w") as f:
        json.dump(data, f)
        
    # Calibrate to determine circuit size and resources
    res = ezkl.calibrate_settings(data_path, model_path, settings_path, "resources")
    if asyncio.iscoroutine(res):
        await res
    
    print("Compiling circuit...")
    res = ezkl.compile_circuit(model_path, compiled_model_path, settings_path)
    if asyncio.iscoroutine(res):
        await res
    
    print("Getting SRS (Structured Reference String)...")
    # This might download files
    res = ezkl.get_srs(settings_path)
    if asyncio.iscoroutine(res):
        await res
    
    print("Setting up keys (PK/VK)...")
    res = ezkl.setup(compiled_model_path, vk_path, pk_path)
    if asyncio.iscoroutine(res):
        await res
    
    print("Creating EVM Verifier...")
    # Generate the solidity contract
    # Note: abi_path is optional but useful, omitting for now to keep simple
    res = ezkl.create_evm_verifier(vk_path, settings_path, verifier_path)
    if asyncio.iscoroutine(res):
        await res
    
    print(f"Success! Verifier generated at {verifier_path}")

if __name__ == "__main__":
    asyncio.run(main())
