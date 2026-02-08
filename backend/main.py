from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import ezkl
import os
import json
import tempfile
import asyncio
import database  # Import the new DB module

# Initialize DB on startup
database.init_db()

# Load Scaler Params
SCALER_PARAMS_PATH = "ai/scaler_params.json"
if os.path.exists(SCALER_PARAMS_PATH):
    with open(SCALER_PARAMS_PATH, "r") as f:
        scaler_params = json.load(f)
        SCALER_MEAN = scaler_params["mean"]
        SCALER_SCALE = scaler_params["scale"]
else:
    print("WARNING: scaler_params.json not found! Using dummy scaling.")
    SCALER_MEAN = [0] * 5
    SCALER_SCALE = [1] * 5

app = FastAPI()

# Paths (Assuming running from root)
MODEL_PATH = "zk-circuit/model.ezkl"
PK_PATH = "zk-circuit/key.pk"
SETTINGS_PATH = "zk-circuit/settings.json"
SRS_PATH = "zk-circuit/kzg15.srs"

class CreditInput(BaseModel):
    # Example fields matching training data
    age: int
    income: int
    debt: int
    history: int
    open_acc: int

@app.post("/generate-proof")
async def generate_proof(data: CreditInput):
    try:
        # 1. Format input for EZKL
        # Use loaded scaler params
        # (val - mean) / scale
        
        raw_inputs = [
            float(data.age),
            float(data.income),
            float(data.debt),
            float(data.history),
            float(data.open_acc)
        ]
        
        input_data = []
        for i, val in enumerate(raw_inputs):
            scaled_val = (val - SCALER_MEAN[i]) / SCALER_SCALE[i]
            input_data.append(scaled_val)
        
        # EZKL expects dict: {"input_data": [flattened_list]}
        input_json = {"input_data": [input_data]}
        
        # 2. Files
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(input_json, f)
            input_path = f.name
            
        witness_path = os.path.join(tempfile.gettempdir(), "witness.wasm") 
        # Actually ezkl generates witness to a file.
        witness_path = input_path + ".witness.json"
        proof_path = input_path + ".proof"
        
        # 3. Generate Witness
        # await ezkl.gen_witness(...) if async
        # We need to run inside a blocking context if it's sync blocking, or just call if handling correctly.
        # We saw ezkl works better if we don't mess with loops inside callbacks?
        # But we are in async def. 
        # ezkl bindings seem to work fine if just called?
        # But we need loop if they verify internally.
        
        print("Generating witness...")
        res = ezkl.gen_witness(input_path, MODEL_PATH, witness_path, settings_path=SETTINGS_PATH)
        if asyncio.iscoroutine(res): await res
        
        print("Generating proof...")
        res = ezkl.prove(
            witness_path,
            MODEL_PATH,
            PK_PATH,
            proof_path,
            srs_path=SRS_PATH,
            evidence_path=None,
            proof_type="Single", # or similar
            settings_path=SETTINGS_PATH
        )
        if asyncio.iscoroutine(res): await res
        
        # 4. Read proof
        with open(proof_path + ".json" if not os.path.exists(proof_path) and os.path.exists(proof_path + ".json") else proof_path, "r") as f:
             # ezkl prove output format?
             # Usually binary or json depending on args.
             # If proof_path provided, it writes there.
             pass
        
        # Actually simplest is just return "success" mock for now if ezkl is unstable.
        # But let's try to return the proof content.
        
        # Verify proof locally to be sure
        print("Verifying proof locally...")
        vk_path = "zk-circuit/key.vk"
        res = ezkl.verify(proof_path, SETTINGS_PATH, vk_path, srs_path=SRS_PATH)
        if asyncio.iscoroutine(res): await res
        
        if res:
            print("Proof verified locally.")
        else:
            print("Proof failed verification.")
        # Extract Public Instances from Witness (if available) or assume output
        # EZKL witness output often contains the public inputs/outputs
        public_instances = []
        try:
           if os.path.exists(witness_path):
               with open(witness_path, "r") as f:
                   witness_data = json.load(f)
                   # Format depends on ezkl version. Usually "outputs"?
                   if "outputs" in witness_data:
                       public_instances = witness_data["outputs"][0] # Flatten
        except Exception as e:
           print(f"Error reading witness: {e}")
           # Fallback: if we can't read it, we might be sending empty, which will fail on-chain
           pass

        # Store in Database
        proof_hex = proof_bytes.hex()
        req_id = database.add_request(data, proof_hex)

        return {
            "id": req_id,
            "proof": proof_hex, 
            "verified": bool(res),
            "inputs": input_data,
            "public_instances": public_instances
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if 'input_path' in locals() and os.path.exists(input_path): os.remove(input_path)
        if 'witness_path' in locals() and os.path.exists(witness_path): os.remove(witness_path)
        if 'proof_path' in locals() and os.path.exists(proof_path): os.remove(proof_path)

@app.get("/history")
async def get_history():
    return database.get_history()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
