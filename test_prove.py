import ezkl
import os
import json
import asyncio

async def main():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ZK_DIR = os.path.join(BASE_DIR, "zk-circuit")
    MODEL_PATH = os.path.join(ZK_DIR, "model.ezkl")
    PK_PATH = os.path.join(ZK_DIR, "key.pk")
    SRS_PATH = os.path.join(ZK_DIR, "kzg15.srs")
    SETTINGS_PATH = os.path.join(ZK_DIR, "settings.json")
    
    INPUT_FILE = "input.json"
    WITNESS_FILE = "witness.json"
    PROOF_FILE = "proof.json"

    # Create dummy input
    data = {"input_data": [[0.5, 0.5, 0.5, 0.5, 0.5]]}
    with open(INPUT_FILE, "w") as f:
        json.dump(data, f)

    print("Generating witness...")
    try:
        res = ezkl.gen_witness(INPUT_FILE, MODEL_PATH, WITNESS_FILE)
        if asyncio.iscoroutine(res): await res
    except Exception as e:
        print(f"Witness generation failed: {e}")
        return

    print("Generating proof...")
    try:
        # Try without srs_path first to see if it picks up from default location
        res = ezkl.prove(
            WITNESS_FILE,
            MODEL_PATH,
            PK_PATH,
            PROOF_FILE,
            srs_path=SRS_PATH
        )
        if asyncio.iscoroutine(res): await res
        print("Proof generated successfully!")
    except Exception as e:
        print(f"Proof generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
