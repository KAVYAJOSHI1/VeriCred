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
    
    INPUT_FILE = "cached_input.json"
    WITNESS_FILE = "cached_witness.json"
    PROOF_FILE = "cached_proof.json"

    # Inputs from test_full_flow.js
    # age: 30, income: 50000, debt: 2000, history: 5, open_acc: 3
    raw_inputs = [30.0, 50000.0, 2000.0, 5.0, 3.0]
    
    # Scaler Params form ai/scaler_params.json
    SCALER_MEAN = [43.819, 84905.976, 25705.825, 14.895, 4.919]
    SCALER_SCALE = [14.983532260451813, 38411.66875541112, 14187.575566331818, 8.563525850956488, 2.5939234761264673]

    scaled_inputs = []
    for i, val in enumerate(raw_inputs):
        scaled_val = (val - SCALER_MEAN[i]) / SCALER_SCALE[i]
        scaled_inputs.append(scaled_val)

    print(f"Raw Inputs: {raw_inputs}")
    print(f"Scaled Inputs: {scaled_inputs}")

    # Create input JSON
    data = {"input_data": [scaled_inputs]}
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
        res = ezkl.prove(
            WITNESS_FILE,
            MODEL_PATH,
            PK_PATH,
            PROOF_FILE,
            srs_path=SRS_PATH
        )
        if asyncio.iscoroutine(res): await res
        print(f"Proof generated successfully to {PROOF_FILE}!")
    except Exception as e:
        print(f"Proof generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
