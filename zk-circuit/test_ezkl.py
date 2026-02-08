import ezkl
import asyncio
import nest_asyncio
import os

nest_asyncio.apply()

async def main():
    print("Running setup...")
    compiled_model_path = "zk-circuit/model.ezkl"
    vk_path = "zk-circuit/key.vk"
    pk_path = "zk-circuit/key.pk"
    
    # Check if compiled model exists
    if not os.path.exists(compiled_model_path):
        print(f"Error: {compiled_model_path} does not exist.")
        return

    try:
        res = ezkl.setup(compiled_model_path, vk_path, pk_path)
        if asyncio.iscoroutine(res):
            await res
        print("Setup complete.")
    except Exception as e:
        print(f"Setup failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
