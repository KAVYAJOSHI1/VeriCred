from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ezkl
import os
import json
import tempfile
import asyncio
import database
import concurrent.futures
from concurrent.futures import ProcessPoolExecutor
import worker

# Initialize DB on startup
database.init_db()

# Load Scaler Params
SCALER_PARAMS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai", "scaler_params.json")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "zk-circuit", "model.ezkl")
PK_PATH = os.path.join(BASE_DIR, "zk-circuit", "key.pk")
SETTINGS_PATH = os.path.join(BASE_DIR, "zk-circuit", "settings.json")
SRS_PATH = os.path.join(BASE_DIR, "zk-circuit", "kzg15.srs")

class CreditInput(BaseModel):
    # Example fields matching training data
    age: int
    income: int
    debt: int
    history: int
    open_acc: int

def process_proof_task(req_id: int, data: CreditInput):
    proof_path = None
    input_path = None
    witness_path = None
    
    try:
        # 1. Format input for EZKL
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
        
        input_json = {"input_data": [input_data]}
        
        # 2. Files
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(input_json, f)
            input_path = f.name
            
        witness_path = input_path + ".witness.json"
        proof_path = input_path + ".proof"
        
        # CACHE BYPASS FOR DEMO
        is_demo_input = (
            data.age == 30 and 
            data.income == 50000 and 
            data.debt == 2000 and 
            data.history == 5 and 
            data.open_acc == 3
        )
        cached_proof_path = "cached_proof.json"
        
        if is_demo_input and os.path.exists(cached_proof_path):
            print("🚀 USING CACHED PROOF FOR DEMO inputs")
            proof_path = cached_proof_path
        else:
            print("Generating witness...")
            import subprocess
            import sys
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_proof_subprocess.py")
            
            try:
                subprocess.run(
                    [sys.executable, script_path, input_path, witness_path, MODEL_PATH, PK_PATH, proof_path, SRS_PATH],
                    capture_output=True, text=True, check=True
                )
            except subprocess.CalledProcessError as e:
                print("Subprocess Error:", e.stderr)
                database.update_request_proof(req_id, None, status='Failed', error=e.stderr)
                return

        # 4. Read proof
        with open(proof_path, "rb") as f:
             proof_bytes = f.read()
             if isinstance(proof_bytes, str):
                 proof_bytes = proof_bytes.encode('utf-8')
        
        proof_hex = proof_bytes.hex()
        
        # Extract Public Instances
        public_instances = []
        
        if proof_path == cached_proof_path:
            # Try to load cached witness if using cached proof
            cached_witness = "cached_witness.json"
            if os.path.exists(cached_witness):
                witness_path = cached_witness
        
        if witness_path and os.path.exists(witness_path):
            try:
                with open(witness_path, "r") as f:
                    witness_data = json.load(f)
                    # Handle different EZKL witness formats
                    if isinstance(witness_data, dict):
                        if "outputs" in witness_data:
                            public_instances = witness_data["outputs"][0]
                        elif "instances" in witness_data:
                            public_instances = witness_data["instances"][0]
                    elif isinstance(witness_data, list):
                        public_instances = witness_data[0]
            except Exception as e:
                print(f"Error loading witness: {e}")
                pass
        
        database.update_request_proof(req_id, proof_hex, public_instances=public_instances, status='Completed')
        print(f"Job {req_id} Completed")

    except Exception as e:
        print(f"Job {req_id} Failed: {e}")
        database.update_request_proof(req_id, None, status='Failed', error=str(e))
    finally:
        if input_path and os.path.exists(input_path): os.remove(input_path)
        if witness_path and os.path.exists(witness_path): os.remove(witness_path)
        if proof_path and os.path.exists(proof_path) and proof_path != "cached_proof.json": os.remove(proof_path)

@app.post("/generate-proof")
async def generate_proof(data: CreditInput, background_tasks: BackgroundTasks):
    try:
        req_id = database.create_request(data)
        background_tasks.add_task(process_proof_task, req_id, data)
        return {
            "id": req_id,
            "status": "Pending",
            "message": "Proof generation started in background"
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/requests/{req_id}")
async def get_request_status(req_id: int):
    req = database.get_request(req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    public_instances = []
    if req['public_instances']:
        try:
            public_instances = json.loads(req['public_instances'])
        except:
            pass

    return {
        "id": req['id'],
        "status": req['status'],
        "proof": req['proof'],
        "public_instances": public_instances
    }

@app.get("/history")
async def get_history():
    return database.get_history()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
