# Lambda Cloud Auto-Shutdown Instance Guide

This package allows you to launch a GPU instance on Lambda Cloud that **automatically shuts down** when idle to save money.

> [!CAUTION]
> **CRITICAL DATA WARNING**:
> When the instance shuts down, **EVERYTHING** on the machine is deleted/wiped **EXCEPT** for what is stored in your **Persistent Storage**.
>
> 🛑 **ALWAYS** save your code, datasets, and models in:
> `/lambda/nfs/<your_filesystem_name>` (or the symlink `~/finetune_storage`)
>
> If you save files on the Desktop, in Documents, or in `/tmp`, they will be **LOST FOREVER** when the instance stops.

---

## 1. Prerequisites Setup (Do this First)

### Step 1.1: Generate an SSH Key
You need an SSH key to connect to the computer.

**Windows (PowerShell):**
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept the default location (C:\Users\You\.ssh\id_ed25519)
```

**Mac/Linux:**
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### Step 1.2: Upload SSH Key to Lambda
1.  Copy the content of your public key (`id_ed25519.pub`).
    *   **Windows**: `Get-Content ~/.ssh/id_ed25519.pub | clip`
    *   **Mac**: `cat ~/.ssh/id_ed25519.pub | pbcopy`
2.  Go to [Lambda SSH Keys](https://cloud.lambdalabs.com/ssh-keys).
3.  Click **Add SSH Key**, paste it, and name it (e.g., `intern_laptop_key`).
4.  **Important**: Copy this *name* precisely. You need it for the `.env` file later.

### Step 1.3: Create Persistent Storage
This is where your files will live.

1.  Go to [Lambda Filesystems](https://cloud.lambdalabs.com/filesystems).
2.  Click **Create Filesystem**.
3.  **Name**: `finetune_storage` (or similar).
4.  **Region**: `us-east-1` (Must match where you launch the VM).
5.  Click **Create**.
6.  **Important**: Copy this *name* precisely.

### Step 1.4: Get API Key
1.  Go to [Lambda API Keys](https://cloud.lambdalabs.com/settings/api).
2.  Generate a new key if you don't have one.
3.  **Copy** the key secret immediately.

---

## 2. Configuration

### 2.1 Virtual Environment Setup (Recommended)
It is best practice to use a virtual environment.

**Windows:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
```

**Mac/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2.2 Install Dependencies
With your virtual environment activated:
```bash
pip install -r requirements.txt
```

### 2.3 Setup `.env` File
1.  Create a file named `.env` in this directory.
2.  Copy the following into it and fill in your details:

```ini
# Your API Key secret
LAMBDA_API_KEY=secret_key_xxxxx

# The EXACT name of the SSH key you added in Step 1.2
SSH_KEY_NAME=intern_laptop_key

# The EXACT name of the filesystem you created in Step 1.3
FILESYSTEM_NAME=finetune_storage

# Region (must match where you created the filesystem)
REGION=us-east-1

# Instance Type (default is A100 40GB)
INSTANCE_TYPE=gpu_1x_a100_sxm4

# Instance Name (Visible in Dashboard)
INSTANCE_NAME=llm-finetune-worker

# Idle Timeout in Minutes (Default 30)
IDLE_TIMEOUT_MINUTES=30

# OS Image Family (default: lambda-stack-22-04)
INSTANCE_IMAGE=lambda-stack-22-04
```

---

## 3. Launching the Instance

Whenever you need to work, run this script:

```bash
python launch_instance.py
```

**What this script does:**
1.  Launches a new GPU instance.
2.  Attaches your persistent storage automatically.
3.  **Installs Dev Tools**: `git`, `htop`, `nvtop`, `tmux`, `unzip`, `curl`.
4.  **Installs GCloud SDK**: `gcloud` CLI is installed so you can interact with Vertex AI/GCS.
5.  Injects an **Auto-Shutdown Service** that runs in the background.

---

## 4. Connecting & Verifying

Once the script says "Success", wait ~2-3 minutes for the instance to boot.

1.  **Get IP Address**:
    Check the [Lambda Dashboard](https://cloud.lambdalabs.com/instances) for the IP address of your new instance.

2.  **Connect via SSH**:
    ```bash
    ssh ubuntu@<INSTANCE_IP>
    ```

3.  **Verify Storage (CRITICAL)**:
    Run this command inside the VM:
    ```bash
    df -h | grep lambda
    ```
    ✅ You should see a line like: `... /lambda/nfs/finetune_storage`.
    
    There is also a shortcut link in your home folder:
    ```bash
    ls -l ~/
    # finetune_storage -> /lambda/nfs/finetune_storage
    ```

4.  **Verify Auto-Shutdown**:
    Check if the service is running:
    ```bash
    sudo systemctl status auto-shutdown.service
    ```
    ✅ It should say `Active: active (running)`.

---

## 5. Working Rules

1.  **Where to save work**:
    ```bash
    cd ~/finetune_storage
    # WORK HERE. CLONE GIT REPOS HERE. SAVE DATA HERE.
    ```

2.  **Setup Google Cloud Auth**:
    Since `gcloud` is installed, you can authenticate once you log in:
    ```bash
    gcloud auth login
    # Follow the link to log in
    ```
    
3.  **How Auto-Shutdown Works**:
    - The system checks every minute.
    - If **GPU is idle** (< 5% usage) **AND** you possess **no active SSH connections**...
    - For **30 continuous minutes**...
    - The instance will **TERMINATE** (Delete itself).

4.  **Coming back**:
    - When you are done, just close your SSH terminal. After 30 mins, it stops billing.
    - To work again, just run `python launch_instance.py` again.
    - Your files in `finetune_storage` will be there waiting for you.
