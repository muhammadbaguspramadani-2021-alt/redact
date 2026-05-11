# ──────────────────────────────────────────────────────────────────────────────
# Redact Secure Drop — VPS Deployment Guide
# ──────────────────────────────────────────────────────────────────────────────

## Requirements
- Ubuntu 22.04+ (or Debian 12+)
- Node.js >= 18
- PM2 (process manager)
- Nginx (reverse proxy, optional)

---

## Step 1: Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

---

## Step 2: Copy files to VPS

```bash
# On your local machine — from the colosseum project root:
scp -r secure-drop/ user@YOUR_VPS_IP:/opt/secure-drop
```

---

## Step 3: Configure environment

```bash
ssh user@YOUR_VPS_IP

cd /opt/secure-drop
cp .env.example .env

# Edit .env with your values
nano .env
# Set:
#   DROP_TOKEN=<generate with: openssl rand -hex 32>
#   ADMIN_TOKEN=<generate with: openssl rand -hex 32>
#   STORAGE_DIR=/var/lib/secure-drop/payloads

# Create storage directory
sudo mkdir -p /var/lib/secure-drop/payloads
sudo chown -R $USER:$USER /var/lib/secure-drop
```

---

## Step 4: Start with PM2

```bash
cd /opt/secure-drop
npm install        # installs express + uuid (optional, server.js uses only built-ins)

# Start
pm2 start server.js --name secure-drop --node-args="--env-file=.env"

# Alternative (if --env-file not supported on older Node):
PORT=4000 DROP_TOKEN=yourtoken STORAGE_DIR=/var/lib/secure-drop/payloads pm2 start server.js --name secure-drop

# Save PM2 config for auto-restart
pm2 save
pm2 startup  # follow the printed command to enable on-boot
```

---

## Step 5: Nginx reverse proxy (HTTPS)

```nginx
# /etc/nginx/sites-available/secure-drop
server {
    listen 80;
    server_name drop.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name drop.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/drop.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drop.yourdomain.com/privkey.pem;

    client_max_body_size 55M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/secure-drop /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate (free via Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d drop.yourdomain.com
```

---

## Step 6: Update Redact app (.env.local on local machine)

```env
SECURE_DROP_URL=https://drop.yourdomain.com
SECURE_DROP_TOKEN=your-drop-token-from-step-3
ALLOW_UPLOAD_SKIP=false
```

---

## API Reference

### Upload (from Redact app)
```
POST https://drop.yourdomain.com
Authorization: Bearer <DROP_TOKEN>
Content-Type: application/json

{
  "id": "INC-ABC123",
  "hash": "64-char-sha256-hex",
  "ciphertext": "base64-aes-gcm-bundle",
  "envelope": { "algo": "...", "ephemeralPublicKey": "...", ... },
  "schema": "redact-secure-drop-v1"
}
```

**Response:**
```json
{ "success": true, "id": "uuid", "url": "/dl/uuid", "receivedAt": "ISO timestamp" }
```

### Health check
```
GET https://drop.yourdomain.com/health
```

### List payloads (HQ admin)
```
GET https://drop.yourdomain.com/list
Authorization: Bearer <ADMIN_TOKEN>
```

### Download a payload (HQ admin)
```
GET https://drop.yourdomain.com/dl/<uuid>
Authorization: Bearer <ADMIN_TOKEN>
```

---

## Security Notes

- All data the server stores is **already encrypted** — only opaque ciphertext reaches the server
- Filenames are UUIDs — not guessable or enumerable
- Files stored with mode 0600 (owner-only read/write)
- Bearer token protects against unauthorized uploads
- For maximum security: firewall the admin port and only expose the upload endpoint publicly
