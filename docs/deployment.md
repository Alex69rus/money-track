# Production Deployment Guide

This guide covers automated deployment using GitHub Actions with Cloudflare Origin Certificates for SSL.

## Prerequisites

- Domain managed by Cloudflare
- AWS EC2 instance (ARM64)
- GitHub repository with Actions enabled

## AWS EC2 Setup

### 1. Launch EC2 Instance

1. **Instance Configuration:**
   - AMI: Amazon Linux 2023 (ARM64)
   - Instance Type: t4g.small (ARM-based Graviton2)
   - Storage: 20GB gp3 SSD minimum
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Security Group Rules:**
   ```
   SSH (22)     - Your IP only
   HTTP (80)    - 0.0.0.0/0
   HTTPS (443)  - 0.0.0.0/0
   ```

### 2. Server Setup Commands

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and back in for Docker group changes to take effect
# Or run: newgrp docker

# Install Git
sudo yum install -y git

# Create deployment directory
sudo mkdir -p /opt/money-track
sudo chown $USER:$USER /opt/money-track
cd /opt/money-track

# Clone repository (or copy files) - Optional for manual setup
# GitHub Actions will handle this automatically
git clone https://github.com/Alex69rus/money-track.git .
```

**Note**: The above manual setup is optional. The recommended approach is to use GitHub Actions for automated deployment.

## Automated Deployment with GitHub Actions

The deployment is fully automated via GitHub Actions. You only need to configure secrets and certificates.

### 3. SSL Certificate Setup (Cloudflare)

We use Cloudflare Origin Certificates for SSL, which are:
- Valid for 3 years (no renewal needed)
- Trusted by Cloudflare's edge servers
- Simpler than Let's Encrypt ACME challenges

Follow the detailed guide: [Cloudflare SSL Setup](./cloudflare-ssl-setup.md)

### 4. GitHub Actions Secrets

Set the following secrets in your GitHub repository:

**Required secrets:**
```
# Server connection
SERVER_HOST=your-ec2-hostname
SERVER_USER=ec2-user
SSH_PRIVATE_KEY=your-private-key-content

# SSL certificates (from Cloudflare)
CLOUDFLARE_CERT=your-cloudflare-origin-certificate
CLOUDFLARE_KEY=your-cloudflare-private-key

# Application secrets
POSTGRES_PASSWORD=your-secure-database-password
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_AI_WEBHOOK_URL=https://your-n8n-webhook-url.com/webhook/chat
```

**How to get certificates:** See [Cloudflare SSL Setup Guide](./cloudflare-ssl-setup.md)

### 5. Domain Configuration

1. **Cloudflare DNS Setup:**
   - Point your domain A record to EC2 public IP
   - Enable Cloudflare proxy (orange cloud) ☁️
   - Set SSL mode to "Full (strict)" in Cloudflare dashboard
   - Enable "Always Use HTTPS"

2. **Automatic Configuration:**
   - No manual nginx config needed
   - GitHub Actions handles SSL certificate deployment
   - Deployment is fully automated

### 6. Health Monitoring

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl -f http://localhost/api/health
curl -f https://your-domain.com/api/health

# Monitor resource usage
docker stats
```

### 7. Backup Strategy

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR
docker exec money-track-postgres-1 pg_dump -U postgres moneytrack > "$BACKUP_DIR/db-$(date +%Y%m%d_%H%M%S).sql"

# Keep only last 7 days
find $BACKUP_DIR -name "db-*.sql" -mtime +7 -delete
```

### 8. Troubleshooting

**Common Issues:**

1. **SSL Certificate Issues:**
   ```bash
   # Check nginx logs for SSL errors
   docker-compose -f docker-compose.prod.yml logs nginx
   
   # Verify certificates are properly mounted
   docker-compose -f docker-compose.prod.yml exec nginx ls -la /etc/nginx/ssl/
   
   # Test SSL configuration
   docker-compose -f docker-compose.prod.yml exec nginx nginx -t
   ```

2. **GitHub Actions Deployment Issues:**
   ```bash
   # Check if certificates were deployed
   ls -la /opt/money-track/ssl/
   
   # Verify certificate permissions
   ls -la /opt/money-track/ssl/cloudflare-key.pem
   # Should show: -rw------- (600 permissions)
   ```

3. **Database Connection Issues:**
   ```bash
   # Check database health
   docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
   
   # Reset database
   docker-compose -f docker-compose.prod.yml down
   docker volume rm money-track_postgres_data
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Service Not Starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs backend
   docker-compose -f docker-compose.prod.yml logs frontend
   docker-compose -f docker-compose.prod.yml logs nginx
   
   # Rebuild images
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

### 9. Security Considerations

1. **Server Security:**
   - Disable root login
   - Use SSH keys only
   - Enable firewall (ufw)
   - Regular security updates

2. **Application Security:**
   - Environment variables in .env.prod
   - Rate limiting in nginx
   - HTTPS only
   - Security headers

3. **Database Security:**
   - Strong passwords
   - Network isolation
   - Regular backups
   - Access logging

## Deployment Checklist

### Initial Setup
- [ ] EC2 instance launched and configured (ARM64)
- [ ] Docker and Docker Compose installed
- [ ] GitHub repository configured with Actions
- [ ] Domain managed by Cloudflare

### Certificate & DNS Setup
- [ ] Cloudflare Origin Certificate generated
- [ ] Certificate added to `CLOUDFLARE_CERT` secret
- [ ] Private key added to `CLOUDFLARE_KEY` secret
- [ ] Domain DNS pointed to EC2 IP (proxied)
- [ ] Cloudflare SSL mode set to "Full (strict)"
- [ ] "Always Use HTTPS" enabled

### GitHub Actions Configuration
- [ ] All required secrets configured
- [ ] SSH access to EC2 verified
- [ ] Deployment pipeline tested
- [ ] ARM64 Docker images building successfully

### Verification
- [ ] HTTPS site accessible
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] All services running

### Optional
- [ ] Monitoring setup
- [ ] Backup strategy implemented