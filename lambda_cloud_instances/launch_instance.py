import os
import requests
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- CONFIGURATION FROM ENV ---
API_KEY = os.getenv("LAMBDA_API_KEY")
SSH_KEY_NAME = os.getenv("SSH_KEY_NAME")
FILESYSTEM_NAME = os.getenv("FILESYSTEM_NAME")
REGION = os.getenv("REGION", "us-east-1")
INSTANCE_TYPE = os.getenv("INSTANCE_TYPE", "gpu_1x_a100_sxm4")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "llm-finetune-worker")
IDLE_TIMEOUT = os.getenv("IDLE_TIMEOUT_MINUTES", "30")
INSTANCE_IMAGE = os.getenv("INSTANCE_IMAGE", "lambda-stack-22-04")
# ------------------------------

if not API_KEY or API_KEY == "your_api_key_here":
    print("❌ Error: LAMBDA_API_KEY not set in .env file.")
    sys.exit(1)

if not SSH_KEY_NAME:
    print("❌ Error: SSH_KEY_NAME not set in .env file.")
    sys.exit(1)

if not FILESYSTEM_NAME:
    print("❌ Error: FILESYSTEM_NAME not set in .env file.")
    sys.exit(1)

LAUNCH_URL = "https://cloud.lambdalabs.com/api/v1/instance-operations/launch"

# User Data Script to be injected into the VM
# - Installs dependencies
# - Creates auto_shutdown_service.py
# - Creates and starts systemd service
USER_DATA_SCRIPT = f"""#!/bin/bash
echo "--- STARTING AUTO-INIT SETUP ---" >> /var/log/user-data.log

# 1. Install Dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y python3-pip git htop nvtop tmux unzip curl apt-transport-https ca-certificates gnupg -q

# 2. Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get update -q && apt-get install -y google-cloud-cli -q

pip3 install requests

# 2. Write the Auto-Shutdown Script
cat << 'EOF' > /home/ubuntu/auto_shutdown_service.py
import os
import time
import subprocess
import requests
import logging

IDLE_THRESHOLD_MINUTES = {IDLE_TIMEOUT}
GPU_UTIL_THRESHOLD = 5
CHECK_INTERVAL_SECONDS = 60
LAMBDA_API_URL = "https://cloud.lambdalabs.com/api/v1/instance-operations/terminate"
LOG_FILE = "/home/ubuntu/auto_shutdown.log"

logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s - %(message)s')

def get_instance_id():
    try:
        # Lambda Cloud uses NoCloud datasource, so HTTP metadata isn't available.
        # We use cloud-init query instead.
        # IMPORTANT: cloud-init returns UUID with hyphens, but Lambda API expects it WITHOUT hyphens.
        return subprocess.check_output(['cloud-init', 'query', 'instance_id'], encoding='utf-8').strip().replace('-', '')
    except Exception as e:
        logging.error(f"Failed to get instance ID: {{e}}")
        return None

def main():
    api_key = os.environ.get("LAMBDA_API_KEY", "").strip()
    instance_id = get_instance_id()
    if not api_key or not instance_id:
        logging.error(f"Missing Config. API Key present: {{bool(api_key)}}, Instance ID: {{instance_id}}. Exiting.")
        return

    logging.info(f"Service Started. Instance: {{instance_id}}")
    idle_start = None
    
    while True:
        try:
            # Check GPU
            gpu_res = subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'], encoding='utf-8')
            utils = [int(x) for x in gpu_res.strip().split('\\n')]
            gpu_idle = all(u < GPU_UTIL_THRESHOLD for u in utils)

            # Check SSH
            ssh_active = 'pts/' in subprocess.check_output(['who'], encoding='utf-8')

            if gpu_idle and not ssh_active:
                if not idle_start:
                    idle_start = time.time()
                    logging.info("Idle detected. Timer started.")
                elif (time.time() - idle_start) / 60 >= IDLE_THRESHOLD_MINUTES:
                    logging.warning("Terminating...")
                    try:
                        resp = requests.post(LAMBDA_API_URL, json={{"instance_ids": [instance_id]}}, auth=(api_key, ""))
                        logging.info(f"API Response: {{resp.status_code}} - {{resp.text}}")
                        
                        if resp.status_code == 200:
                            logging.info("Termination successful. Exiting.")
                            break
                        else:
                            logging.error("Termination failed. Retrying in next loop...")
                            # Reset timer to avoid hammering the API immediately? 
                            # No, keep it eligible for termination but wait for interval
                    except Exception as e:
                        logging.error(f"API Request Exception: {{e}}")
            else:
                idle_start = None
        except Exception as e:
            logging.error(f"Error: {{e}}")
        
        time.sleep(CHECK_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
EOF

# 3. Create Systemd Service
cat <<EOF > /etc/systemd/system/auto-shutdown.service
[Unit]
Description=Auto Shutdown Service
After=network.target

[Service]
Type=simple
User=ubuntu
Environment="LAMBDA_API_KEY={API_KEY}"
ExecStart=/usr/bin/python3 /home/ubuntu/auto_shutdown_service.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 4. Start Service
systemctl daemon-reload
systemctl enable auto-shutdown.service
systemctl start auto-shutdown.service
echo "--- SETUP COMPLETE ---" >> /var/log/user-data.log"""

def check_existing_instance():
    print(f"🔍 Checking for existing instance named '{INSTANCE_NAME}'...")
    url = "https://cloud.lambdalabs.com/api/v1/instances"
    try:
        resp = requests.get(url, auth=(API_KEY, ""))
        if resp.status_code == 200:
            instances = resp.json().get('data', [])
            for inst in instances:
                if inst.get('name') == INSTANCE_NAME and inst.get('status') in ['active', 'booting']:
                    ip = inst.get('ip')
                    print(f"\n✅ Instance '{INSTANCE_NAME}' is already running!")
                    print(f"   ID: {inst.get('id')}")
                    print(f"   IP: {ip}")
                    print(f"   Status: {inst.get('status')}")
                    print(f"\n   SSH Command: ssh ubuntu@{ip}")
                    return True
        else:
            print(f"⚠️ Failed to list instances. Status: {resp.status_code}")
    except Exception as e:
        print(f"⚠️ Error checking instances: {e}")
    
    return False

def launch_instance():
    if check_existing_instance():
        return

    print(f"🚀 Launching {INSTANCE_TYPE} in {REGION}...")
    print(f"   Name: {INSTANCE_NAME}")
    print(f"   Image: {INSTANCE_IMAGE}")
    print(f"   Filesystem: {FILESYSTEM_NAME}")
    print(f"   SSH Key: {SSH_KEY_NAME}")
    
    payload = {
        "region_name": REGION,
        "instance_type_name": INSTANCE_TYPE,
        "ssh_key_names": [SSH_KEY_NAME],
        "file_system_names": [FILESYSTEM_NAME],
        "quantity": 1,
        "name": INSTANCE_NAME,
        "image": {"family": INSTANCE_IMAGE},
        "user_data": USER_DATA_SCRIPT
    }

    try:
        resp = requests.post(
            LAUNCH_URL, 
            json=payload, 
            auth=(API_KEY, "")
        )
        
        if resp.status_code == 200:
            data = resp.json()
            instance_ids = data.get('data', {}).get('instance_ids', [])
            print(f"\n✅ Success! Launched Instance IDs: {instance_ids}")
            print("\n⏳ The instance is booting. It will take a few minutes for the status to become 'active'.")
            print("   The auto-shutdown service has been injected and will start automatically.")
            print("\n   To monitor the setup log once inside:")
            print("   tail -f /var/log/user-data.log")
        else:
            print(f"\n❌ Failed to launch instance. Status: {resp.status_code}")
            print(f"Response: {resp.text}")
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")

if __name__ == "__main__":
    launch_instance()
