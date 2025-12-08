# 🚀 GPU Desktop Setup Guide for Interns

Welcome! This guide will help you connect to your cloud GPU desktop and start working on ML fine-tuning.

---

## 📋 Prerequisites

Before you start, make sure you have:
- [ ] Google Cloud account with access granted (you'll receive an email invite)
- [ ] VS Code installed on your laptop ([Download here](https://code.visualstudio.com/))
- [ ] Google Cloud CLI installed ([Download here](https://cloud.google.com/sdk/docs/install))

---

## 🖥️ Your Assigned Machine

| Intern | Machine Name | GPU | Purpose | Zone |
|--------|--------------|-----|---------|------|
| madhuvandhan0723@gmail.com | `sentinel-hive-dev` | **Tesla T4** (16GB VRAM) | LLM Fine-tuning | us-central1-a |
| muraliyasha11@gmail.com | `voice-model-dev` | **Tesla T4** (16GB VRAM) | Voice Fine-tuning | us-central1-a |

**Common Specs:** 4 vCPU, 16GB RAM, 200GB SSD

---

## 🔧 One-Time Setup (Do this once)

### Step 1: Install Google Cloud CLI

1. Download and install from: https://cloud.google.com/sdk/docs/install
2. Open a terminal and run:
   ```bash
   gcloud init
   ```
3. Follow the prompts to log in with your Google account (use the email from the table above)

### Step 2: Set Default Project

```bash
gcloud config set project agent-forge-stg-57c7
```

### Step 3: Install VS Code Extensions

Open VS Code and install these extensions (press `Cmd+Shift+X` / `Ctrl+Shift+X`):

| Extension | Purpose |
|-----------|---------|
| **Remote - SSH** | Connect to your cloud VM |
| **Docker** | View and manage containers |
| **Python** | Python development |
| **Jupyter** | Notebook support |

---

## 🖥️ Daily Workflow

### Starting Your GPU Desktop

#### Option A: Using Terminal (CLI)

```bash
# For Madhu (LLM fine-tuning):
gcloud compute instances start sentinel-hive-dev --zone=us-central1-c

# For Murali (Voice fine-tuning):
gcloud compute instances start voice-model-dev --zone=us-central1-a
```

#### Option B: Using GCP Console (Browser)

1. Go to [GCP Console → Compute Engine → VM Instances](https://console.cloud.google.com/compute/instances?project=agent-forge-stg-57c7)
2. Find your VM in the list (`sentinel-hive-dev` or `voice-model-dev`)
3. Click the **⋮** (three dots) menu on the right → **Start**
4. Wait for the status to change to ✅ **Running**

Wait 2-3 minutes for the VM to fully boot and NVIDIA drivers to initialize.

---

## 🔐 Connecting via SSH (IAP Tunnel)

> **Important:** These VMs do NOT have external IPs for security. You connect through Google's Identity-Aware Proxy (IAP).

### Option A: Direct SSH (Quick Access)

```bash
# For Madhu:
gcloud compute ssh sentinel-hive-dev --zone=us-central1-c --tunnel-through-iap

# For Murali:
gcloud compute ssh voice-model-dev --zone=us-central1-a --tunnel-through-iap
```

The first time you connect, it will generate SSH keys automatically.

### Option B: VS Code Remote (Recommended for Development)

#### First-time setup:

1. **Create an IAP tunnel config** by adding this to your SSH config file:

   **On Mac/Linux:** `~/.ssh/config`
   **On Windows:** `C:\Users\YOUR_USERNAME\.ssh\config`

   ```
   # For Madhu (sentinel-hive-dev)
   Host sentinel-hive-dev
       HostName sentinel-hive-dev
       User YOUR_EMAIL_USERNAME
       ProxyCommand gcloud compute start-iap-tunnel sentinel-hive-dev 22 --zone=us-central1-c --project=agent-forge-stg-57c7 --local-host-port=localhost:%p --quiet
       StrictHostKeyChecking no
   
   # For Murali (voice-model-dev)
   Host voice-model-dev
       HostName voice-model-dev
       User YOUR_EMAIL_USERNAME
       ProxyCommand gcloud compute start-iap-tunnel voice-model-dev 22 --zone=us-central1-a --project=agent-forge-stg-57c7 --local-host-port=localhost:%p --quiet
       StrictHostKeyChecking no
   ```

   > Replace `YOUR_EMAIL_USERNAME` with your email prefix (e.g., `madhuvandhan0723` or `muraliyasha11`)

2. **Connect from VS Code:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Remote-SSH: Connect to Host"
   - Select your machine name (`sentinel-hive-dev` or `voice-model-dev`)

**🎉 You're now connected!** VS Code runs on your laptop, but code executes on the cloud GPU.

---

## 🐳 Using Docker Extension

Once connected to the remote VM:

1. Click the **Docker icon** in the left sidebar (whale icon 🐳)
2. You'll see:
   - **Containers**: Running/stopped containers
   - **Images**: Downloaded Docker images
   - **Compose**: Your docker-compose stacks

3. Right-click on containers to:
   - Start/Stop/Restart
   - View Logs
   - Attach Shell
   - Open in Browser (if web app)

---

## ✅ Verifying GPU Access

Open a terminal in VS Code (`` Ctrl+` ``) and run:

```bash
nvidia-smi
```

You should see your GPU:

**Madhu (sentinel-hive-dev):** NVIDIA L4 with ~24GB memory
**Murali (voice-model-dev):** Tesla T4 with ~16GB memory

```
name, memory.total [MiB]
NVIDIA L4, 23034 MiB       # or Tesla T4, 15360 MiB
```

---

## 🛑 Stopping Your VM (IMPORTANT! 💰)

**Always stop your VM when you're done for the day!**

#### Option A: Using Terminal (CLI)

```bash
# For Madhu:
gcloud compute instances stop sentinel-hive-dev --zone=us-central1-c

# For Murali:
gcloud compute instances stop voice-model-dev --zone=us-central1-a
```

#### Option B: Using GCP Console (Browser)

1. Go to [GCP Console → Compute Engine → VM Instances](https://console.cloud.google.com/compute/instances?project=agent-forge-stg-57c7)
2. Find your VM in the list
3. Click the **⋮** (three dots) menu on the right → **Stop**
4. Confirm the stop action
5. Wait for the status to change to ⬛ **Stopped**

> ⚠️ **Cost Warning**: The VM costs ~$0.70/hour when running. A forgotten VM running 24/7 = ~$500/month!
> 
> **Auto-stop features:**
> - 🤖 **Idle shutdown**: VM auto-stops after **30 minutes of inactivity** (GPU <5% AND CPU <10%)
> - 🌙 **Nightly shutdown**: Safety net at **3 AM Singapore time** (planned)
> 
> Please still stop manually when done - don't rely solely on auto-stop!

---

## 🐳 Docker Compose Tips

### Starting your fine-tuning stack
```bash
cd ~/your-project
docker compose up -d
```

### Viewing logs
```bash
docker compose logs -f service-name
```

### Stopping everything
```bash
docker compose down
```

### GPU access in containers
Your containers need the NVIDIA runtime. Example `docker-compose.yml`:
```yaml
services:
  training:
    image: your-training-image
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## 📁 Where to Put Your Code

```
/home/YOUR_USERNAME/
├── projects/           # Your code here
├── datasets/           # Training data
└── models/             # Saved models/checkpoints
```

> 💡 **Tip**: The boot disk is 200GB SSD. For large datasets, let your admin know if you need more space.

---

## 🆘 Troubleshooting

### "Permission denied" when starting/stopping VM
- Make sure you're logged into gcloud: `gcloud auth login`
- Verify your access: `gcloud projects list` (you should see `agent-forge-stg-57c7`)

### IAP tunnel connection failed
1. Re-authenticate:
   ```bash
   gcloud auth login
   ```
2. Make sure the VM is running:
   ```bash
   gcloud compute instances describe YOUR_VM_NAME --zone=YOUR_ZONE --format="get(status)"
   ```

### VS Code can't connect
1. Make sure the VM is running
2. Try connecting via direct SSH first to verify access:
   ```bash
   gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE --tunnel-through-iap
   ```
3. Reload VS Code window (`Cmd+Shift+P` → "Developer: Reload Window")

### Docker extension not showing containers
1. Make sure you're connected to the remote VM (check bottom-left corner of VS Code)
2. Open a terminal and run `docker ps` to verify Docker is working
3. Reload VS Code window

### nvidia-smi not found
Wait 5-10 minutes after first boot - NVIDIA drivers are being installed automatically.

---

## 📞 Need Help?

Contact your admin (Naga) if you have issues with:
- VM access or permissions
- Disk space running out
- GPU not being detected
- Billing questions

Happy fine-tuning! 🎯
