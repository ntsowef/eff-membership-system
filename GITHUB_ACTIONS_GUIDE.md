# GitHub Actions Deployment Guide

This guide explains how to configure and use the automated deployment pipelines for the **EFF Membership Portal**.

## 1. Prerequisites (Server Side)

Before GitHub can deploy, your servers must be ready to accept connections.

### Backend Server (`api.effmemberportal.org`)
1.  **Create Directory**: `sudo mkdir -p /var/www/api.effmemberportal.org/backend`
2.  **Set Permissions**: `sudo chown -R $USER:$USER /var/www/api.effmemberportal.org`
3.  **Install Production Tools**:
    ```bash
    npm install -g pm2
    sudo apt install docker.io docker-compose
    ```

### Frontend Server (`effmemberportal.org`)
1.  **Create Directory**: `sudo mkdir -p /var/www/effmemberportal.org/html`
2.  **Set Permissions**: `sudo chown -R $USER:$USER /var/www/effmemberportal.org`

---

## 2. Configure GitHub Secrets

Go to your Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `SSH_USER` | `ubuntu` or `root` | The SSH username for your servers. |
| `SSH_PRIVATE_KEY` | `-----BEGIN RSA PRIVATE KEY...` | Your private SSH key (must correspond to `~/.ssh/authorized_keys` on servers). |
| `BACKEND_HOST` | `api.effmemberportal.org` | Hostname/IP of the Backend server. |
| `FRONTEND_HOST` | `effmemberportal.org` | Hostname/IP of the Frontend server. |

**Optional Variables** (Variables tab):
| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://api.effmemberportal.org/api/v1` | Backend API URL for the frontend build. |
| `SSH_PORT` | `22` | SSH port if non-standard. |

---

## 3. The Workflows

We have configured two separate workflows to handle the split architecture.

### 🅰️ Frontend Deploy (`frontend-deploy.yml`)
*   **Triggers**: Changes in `frontend/**` directory on `main` branch.
*   **Process**:
    1.  Installs Node.js dependencies.
    2.  Builds the React application (injecting `VITE_API_URL`).
    3.  Copies the contents of `frontend/dist/` to the Frontend Server using SCP.
*   **Zero Downtime**: Yes (Nginx serves static files instantly).

### 🅱️ Backend Deploy (`backend-deploy.yml`)
*   **Triggers**: Changes in `backend/**` directory on `main` branch.
*   **Process**:
    1.  Copies source code to the Backend Server.
    2.  Logs in via SSH.
    3.  Installs production dependencies (`npm install --production`).
    4.  Runs Database Migrations (`npx migrate deploy`).
    5.  Builds TypeScript (`npm run build`).
    6.  Restarts the Node.js process (`pm2 reload`).

---

## 4. Triggering a Deployment

### Automated Method
Simply **push code** to the `main` branch.
```bash
git add frontend/
git commit -m "Update login page design"
git push origin main
# This will trigger ONLY the Frontend pipeline
```

### Manual Method (Rollbacks/Redeploys)
1.  Go to the **Actions** tab in GitHub.
2.  Select **Deploy Frontend** or **Deploy Backend** on the left.
3.  Click **Run workflow** -> **Run workflow**.

---

## 5. Troubleshooting Common Issues

**Issue**: `Host key verification failed`
*   **Fix**: Ensure your GitHub Action runner trusts the known hosts, or use the `appleboy/ssh-action` which handles strict host checking automatically (configured).

**Issue**: `Permission denied`
*   **Fix**: Ensure `SSH_USER` owns the target folders on the server:
    ```bash
    sudo chown -R $USER:$USER /var/www/...
    ```

**Issue**: `PM2 not found`
*   **Fix**: Ensure PM2 is in the `$PATH` for the SSH user, or use absolute path in the script. The workflow installs deps but PM2 should be global.
