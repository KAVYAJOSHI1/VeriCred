import ezkl
import asyncio
import nest_asyncio
import os
import json

nest_asyncio.apply()

async def main():
    settings_path = "zk-circuit/settings.json"
    compiled_model_path = "zk-circuit/model.ezkl"
    vk_path = "zk-circuit/key.vk"
    pk_path = "zk-circuit/key.pk"
    
    srs_path = "zk-circuit/kzg15.srs"

    if not os.path.exists(srs_path):
        print("Generating SRS locally...")
        with open(settings_path) as f:
            settings = json.load(f)
        logrows = settings["run_args"]["logrows"]
        
        # gen_srs might be synchronous
        res = ezkl.gen_srs(srs_path, logrows)
        if asyncio.iscoroutine(res): await res
        print(f"SRS generated at {srs_path}")

    print("Running setup...")
    try:
        # Pass srs_path explicitly
        res = ezkl.setup(compiled_model_path, vk_path, pk_path, srs_path=srs_path)
        if asyncio.iscoroutine(res): await res
        print("Setup complete.")
    except Exception as e:
        print(f"Setup failed: {e}")
        return
    
    print("Creating Verifier...")
    verifier_path = os.path.abspath("blockchain/contracts/Verifier.sol")
    abi_path = "zk-circuit/Verifier.abi"
    try:
        # Pass abi_path and srs_path
        res = ezkl.create_evm_verifier(vk_path, settings_path, verifier_path, abi_path, srs_path)
        # res is a Future, so we must await it
        res = await res
        
        print(f"Result type: {type(res)}")
        # If result is boolean True/False, and file not created, maybe verifier_path is ignored?
        # If result is string, write it.
        if isinstance(res, str):
            print("Result is a string. Writing to file...")
            with open(verifier_path, "w") as f:
                f.write(res)
        elif res is True:
             print("Result is True. File should have been created.")
        
        if os.path.exists(verifier_path):
            print(f"Verifier created successfully at {verifier_path}")
        else:
            print(f"Verifier creation FAILED. File not found at {verifier_path}")
    except Exception as e:
        print(f"Verifier creation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
