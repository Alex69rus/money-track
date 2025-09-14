# Production Deployment Guide

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

# Clone repository (or copy files)
git clone https://github.com/akukharev/money-track.git .

# Set up environment
cp .env.prod.example .env.prod
# Edit .env.prod with your actual values
sudo yum install -y nano
nano .env.prod
```

### 3. SSL Certificate Setup

```bash
# Create directories for SSL
sudo mkdir -p /opt/money-track/certbot/www
sudo mkdir -p /opt/money-track/certbot/conf

# Start services without SSL first
docker-compose -f docker-compose.prod.yml up -d postgres backend frontend nginx

# Wait for services to be ready
sleep 30

# Request SSL certificate
docker run --rm \
  -v /opt/money-track/certbot/www:/var/www/certbot \
  -v /opt/money-track/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email your-email@domain.com \
  --agree-tos --no-eff-email \
  -d your-domain.com

# Update nginx config with your domain
sed -i 's/money-track/your-domain.com/g' nginx/conf.d/default.conf

# Restart with SSL
docker-compose -f docker-compose.prod.yml restart nginx
```

### 4. GitHub Actions Secrets

Set the following secrets in your GitHub repository:

```
SERVER_HOST=your-ec2-public-ip
SERVER_USER=ec2-user
SSH_PRIVATE_KEY=your-private-key-content
POSTGRES_PASSWORD=your-secure-database-password
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_AI_WEBHOOK_URL=https://your-n8n-webhook-url.com/webhook/chat
```

### 5. Domain Configuration

1. **DNS Setup:**
   - Point your domain A record to EC2 public IP
   - Wait for DNS propagation (up to 24 hours)

2. **Update Configuration:**
   ```bash
   # Update nginx config with your domain
   sudo nano /opt/money-track/nginx/conf.d/default.conf
   # Replace 'money-track' with your actual domain
   
   # Update SSL certificate path
   sudo nano /opt/money-track/nginx/conf.d/default.conf
   # Update certificate paths to match your domain
   ```

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
   # Check certificate status
   docker-compose logs certbot
   
   # Renew certificate manually
   docker run --rm -v /opt/money-track/certbot/conf:/etc/letsencrypt certbot/certbot renew
   ```

2. **Database Connection Issues:**
   ```bash
   # Check database health
   docker-compose exec postgres pg_isready -U postgres
   
   # Reset database
   docker-compose down
   docker volume rm money-track_postgres_data
   docker-compose up -d
   ```

3. **Service Not Starting:**
   ```bash
   # Check logs
   docker-compose logs backend
   docker-compose logs frontend
   
   # Rebuild images
   docker-compose down
   docker-compose pull
   docker-compose up -d
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

- [ ] EC2 instance launched and configured
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to /opt/money-track
- [ ] Environment variables configured
- [ ] SSL certificate obtained
- [ ] Domain DNS configured
- [ ] GitHub Actions secrets set
- [ ] Deployment pipeline tested
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] Backup strategy implemented