# Cloudflare Origin Certificates Setup

This guide will help you obtain Cloudflare Origin Certificates and configure them in GitHub Actions for automatic deployment.

## Step 1: Generate Cloudflare Origin Certificate

### 1.1 Access Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain (e.g., `money-track.org`)
3. Navigate to **SSL/TLS** → **Origin Server**

### 1.2 Create Origin Certificate
1. Click **"Create Certificate"**
2. **Certificate Type**: Choose **"Let Cloudflare generate a private key and a CSR"**
3. **Hostnames**: Add your hostnames:
   - `money-track.org` (or your domain)
   - `*.money-track.org` (wildcard for subdomains)
4. **Certificate Validity**: Choose **15 years** (maximum)
5. Click **"Create"**

### 1.3 Download Certificate Files
After creation, you'll see two text boxes:

1. **Origin Certificate** (Public Key):
   ```
   -----BEGIN CERTIFICATE-----
   [Long certificate content]
   -----END CERTIFICATE-----
   ```

2. **Private Key**:
   ```
   -----BEGIN PRIVATE KEY-----
   [Long private key content]
   -----END PRIVATE KEY-----
   ```

## Step 2: Add Certificates to GitHub Secrets

### 2.1 Access GitHub Repository Settings
1. Go to your GitHub repository: `https://github.com/Alex69rus/money-track`
2. Click **Settings** → **Secrets and variables** → **Actions**

### 2.2 Add Certificate Secrets
Create these two secrets:

1. **CLOUDFLARE_CERT**:
   - Click **"New repository secret"**
   - Name: `CLOUDFLARE_CERT`
   - Value: Paste the entire **Origin Certificate** (including BEGIN/END lines)

2. **CLOUDFLARE_KEY**:
   - Click **"New repository secret"**
   - Name: `CLOUDFLARE_KEY`
   - Value: Paste the entire **Private Key** (including BEGIN/END lines)

## Step 3: Configure Cloudflare SSL Mode

### 3.1 Set SSL Mode to "Full (Strict)"
1. In Cloudflare Dashboard, go to **SSL/TLS** → **Overview**
2. Set **SSL/TLS encryption mode** to **"Full (strict)"**
   - This ensures end-to-end encryption
   - Cloudflare will verify your origin certificate

### 3.2 Enable "Always Use HTTPS"
1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable **"Always Use HTTPS"**
   - This redirects all HTTP traffic to HTTPS

## Step 4: DNS Configuration

### 4.1 Ensure Proxy is Enabled
1. Go to **DNS** → **Records**
2. Make sure your A record has **Proxy status: Proxied** (orange cloud icon)
   - Name: `@` (or your subdomain)
   - Type: `A`
   - Content: Your EC2 IP address
   - Proxy status: **Proxied** 🟠

## Step 5: Deploy and Test

### 5.1 Trigger Deployment
1. Push your changes or manually trigger the GitHub Action´
2. The deployment will automatically:
   - Deploy Cloudflare certificates to the server
   - Start nginx with HTTPS configuration
   - Redirect HTTP to HTTPS

### 5.2 Verify HTTPS
1. Visit your domain: `https://money-track.org`
2. Check that the SSL certificate is valid
3. Verify HTTP redirects to HTTPS

## Expected GitHub Secrets

After setup, you should have these secrets configured:

- ✅ `CLOUDFLARE_CERT` - Origin certificate (public key)
- ✅ `CLOUDFLARE_KEY` - Private key
- ✅ `SERVER_HOST` - EC2 hostname
- ✅ `SERVER_USER` - SSH user (ec2-user)
- ✅ `SSH_PRIVATE_KEY` - SSH private key for EC2
- ✅ `POSTGRES_PASSWORD` - Database password
- ✅ `TELEGRAM_BOT_TOKEN` - Bot token
- ✅ `DOMAIN` - Your domain name
- ✅ `EMAIL` - Your email address
- ✅ `REACT_APP_API_URL` - API URL (https://your-domain.com/api)
- ✅ `REACT_APP_AI_WEBHOOK_URL` - AI webhook URL

## Benefits of Cloudflare Origin Certificates

✅ **15-year validity** - No renewal needed  
✅ **No ACME challenges** - No complex certbot setup  
✅ **Immediate deployment** - Certificates available instantly  
✅ **End-to-end encryption** - Secure connection from Cloudflare to your server  
✅ **Simple automation** - Just deploy files via GitHub Actions  

## Troubleshooting

### Certificate Verification Issues
If you see SSL errors:
1. Verify certificates are correctly pasted in GitHub secrets
2. Check that Cloudflare SSL mode is "Full (strict)"
3. Ensure domain matches certificate hostnames

### Deployment Issues
Check GitHub Actions logs for:
- Certificate file creation errors
- nginx startup failures
- Docker container status

The deployment now uses a much simpler approach with reliable Cloudflare certificates!