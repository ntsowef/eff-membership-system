# DevOps & Deployment Strategy: EFF Membership System

## 1. System Architecture Overview

The system utilizes a **Hybrid Architecture** across two servers, leveraging Docker for data and standard web server patterns for applications.

### Server Topology
1.  **Frontend Server** (`effmemberportal.org`)
    *   **Role**: Serves the Static React SPA.
    *   **Technology**: Nginx (Web Server).
    *   **Deployment Path**: `/var/www/effmemberportal.org/frontend` (Standard Nginx directory).
    *   **Traffic**: Public Internet -> Nginx -> Index.html.
    
2.  **Backend Server** (`api.effmemberportal.org`)
    *   **Role**: Hosts the API and Database.
    *   **Technology**: 
        *   **App**: Node.js (PM2) + Nginx (Reverse Proxy).
        *   **Database**: PostgreSQL (**DockerContainer** with persistent volume).
    *   **Deployment Path**: `/var/www/api.effmemberportal.org/backend`.
    *   **Traffic**: Frontend -> Nginx Proxy -> Localhost:5000 -> Dockerized DB (Port 5432).

## 2. Deployment Strategies

### Strategy A: Hybrid Deployment (Current/Refined)
*   **Database**: Managed via `docker-compose.postgres.yml`.
    ```bash
    docker compose -f docker-compose.postgres.yml up -d
    ```
*   **Applications**:
    1.  **Backend**:
        *   Deploy code to `/var/www/api...`
        *   PM2 manages the Node process (`pm2 start dist/app.js`).
        *   Nginx proxies port 80/443 to internal port 5000.
    2.  **Frontend**:
        *   Deploy built assets (`dist/`) to `/var/www/eff...`
        *   Nginx serves static files directly.

### Strategy B: Fully Containerized (Future Goal)
*   Move Node.js API and Nginx into Docker containers to unify the stack with the Database.
*   **Benefit**: Eliminates "environment drift" between dev and prod.

---

## 3. Recommended Production Infrastructure

| Component | Specification | Notes |
| :--- | :--- | :--- |
| **Backend Server** | 4 vCPUs, 8GB RAM | Runs API + Docker (DB/Redis) + Worker Scripts. |
| **Frontend Server** | 1 vCPU, 2GB RAM | Lightweight Nginx static serving. |
| **Directory Structure** | `/var/www/<domain>/` | Standard Nginx conventions for easy permission management. |
| **Database Storage** | Docker Volume (Host Mapped) | Ensure `/var/lib/docker/volumes` or mapped path is backed up. |

---

## 4. CI/CD Pipeline Strategy (GitHub Actions)

### Pipeline 1: Backend Deployment
1.  **CI**: Test & Build Node.js app.
2.  **CD**:
    *   SCP artifact to **Backend Server**.
    *   SSH Command:
        *   `pm2 stop backend`
        *   `npx prisma migrate deploy` (Connects to Docker DB).
        *   `pm2 restart backend`.

### Pipeline 2: Frontend Deployment
1.  **CI**: Build React App (`npm run build`).
2.  **CD**:
    *   Rsync `dist/` folder to **Frontend Server** (`/var/www/effmemberportal.org`).
    *   No restart needed (Nginx serves static files).


---

## 5. Security & Monitoring Checklist

- [ ] **SSL/TLS**: Use Let's Encrypt (Certbot) for all public endpoints.
- [ ] **Firewall**: UFW enabled. Allow `ssh`, `http`, `https`. Deny all else.
- [ ] **Database**:
    -   Disable remote root login.
    -   Daily automated `pg_dump` backups to S3/External Storage.
- [ ] **Monitoring**:
    -   Use **PM2 Monitor** or **Prometheus/Grafana** for resource usage.
    -   Uptime Kuma for external health checks (`/api/v1/health`).

## 6. How to Deploy (Current Method)

To deploy the current version using the existing scripts:

1.  **Prepare Server**:
    ```bash
    sudo apt update && sudo apt install nodejs npm postgresql redis-server nginx python3-pip
    sudo npm install -g pm2
    ```

2.  **Clone & Configure**:
    ```bash
    git clone <repo_url> /var/www/eff-membership
    cp .env.production.template .env
    # Edit .env with real credentials
    ```

3.  **Run Deployment Script**:
    ```bash
    chmod +x deploy-production.sh
    sudo ./deploy-production.sh
    ```

4.  **Finalize Nginx**:
    *   Configure `/etc/nginx/sites-available/eff-membership` to proxy `/api` to `localhost:5000`.
