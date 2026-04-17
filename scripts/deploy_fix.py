import os
import subprocess
import json
import shutil

FIREBASE_JSON = "firebase.json"
BACKUP_JSON = "firebase.json.bak"

# 1. Backup
shutil.copy2(FIREBASE_JSON, BACKUP_JSON)

try:
    # 2. Modify to skip predeploy
    with open(FIREBASE_JSON, "r") as f:
        data = json.load(f)

    if "hosting" in data and "predeploy" in data["hosting"]:
        data["hosting"]["predeploy"] = ["echo skipping build because admin is already merged"]

    with open(FIREBASE_JSON, "w") as f:
        json.dump(data, f, indent=2)

    print("Modified firebase.json to skip build-all.js")

    # 3. Deploy
    print("Starting deployment (this may take a minute)...")
    # subprocess.run with shell=True is needed for firebase.cmd on Windows
    result = subprocess.run('firebase deploy --only "hosting,functions"', shell=True, capture_output=True, text=True)
    
    print("STDOUT:")
    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
        
    if result.returncode == 0:
        print("Deployment successful!")
    else:
        print(f"Deployment failed with return code {result.returncode}")

finally:
    # 4. Restore
    if os.path.exists(BACKUP_JSON):
        shutil.move(BACKUP_JSON, FIREBASE_JSON)
        print("Restored firebase.json")
