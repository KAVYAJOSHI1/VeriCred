import ezkl
import sys
import json
import os

def main():
    if len(sys.argv) < 6:
        print("Usage: python generate_proof_script.py <input_path> <witness_path> <model_path> <pk_path> <proof_path> <srs_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    witness_path = sys.argv[2]
    model_path = sys.argv[3]
    pk_path = sys.argv[4]
    proof_path = sys.argv[5]
    srs_path = sys.argv[6]

    try:
        print(f"Generating Witness from {input_path}...")
        ezkl.gen_witness(input_path, model_path, witness_path)
        
        print(f"Generating Proof to {proof_path}...")
        ezkl.prove(
            witness_path,
            model_path,
            pk_path,
            proof_path,
            srs_path=srs_path
        )
        print("Proof Generation Complete.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
