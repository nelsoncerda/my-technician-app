# Deployment Guide for AWS Lightsail

This guide outlines the steps to deploy your application to an AWS Lightsail instance.

## Prerequisites

1.  **AWS Lightsail Instance**:
    -   Create an instance using the **OS Only (Ubuntu 22.04)** or **Apps + OS (Node.js)** blueprint.
    -   Attach a static IP to your instance.
2.  **Domain Name**:
    -   Point your domain (`nelsoncerda.com`) to the static IP of your Lightsail instance.

## 1. Local Preparation

Ensure your project is ready for deployment.

### Server
The server is configured to build TypeScript to JavaScript.
- **Build**: `npm run build` (in `server` directory)
- **Start**: `npm start` (runs `node dist/index.js`)

### Frontend
The frontend needs to be built for production.
- **Build**: `npm run build` (in root directory)
- **Output**: The build artifacts will be in the `build` folder.

## 2. Server Setup (Remote)

SSH into your Lightsail instance.

### Install Dependencies
Update packages and install Node.js, Nginx, and PostgreSQL.

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib
# Install Node.js (if not using Node.js blueprint)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Install PM2
sudo npm install -g pm2
```

### Configure PostgreSQL
Create a database and user.

```bash
sudo -u postgres psql
```

Inside the SQL prompt:
```sql
CREATE DATABASE my_technician_app;
CREATE USER myuser WITH ENCRYPTED PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE my_technician_app TO myuser;
\q
```

## 3. Deploy Application

### Transfer Files
You can use `git` to clone your repository or `scp` to copy files.
Recommended: Clone via Git.

```bash
git clone <your-repo-url> app
cd app
```

### Setup Backend
1.  Navigate to server: `cd server`
2.  Install dependencies: `npm install`
3.  Create `.env` file:
    ```bash
    nano .env
    ```
    Add:
    ```env
    DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/my_technician_app?schema=public"
    PORT=3001
    # Add other secrets
    ```
4.  Run migrations: `npx prisma migrate deploy`
5.  Build server: `npm run build`
6.  Start with PM2:
    ```bash
    pm2 start dist/index.js --name "api"
    ```

### Setup Frontend
1.  Navigate to root: `cd ..`
2.  Install dependencies: `npm install`
3.  Build frontend: `npm run build`
4.  Move build files to Nginx web root:
    ```bash
    sudo mkdir -p /var/www/nelsoncerda.com
    sudo cp -r build/* /var/www/nelsoncerda.com/
    ```

## 4. Configure Nginx

Create an Nginx config file.

```bash
sudo nano /etc/nginx/sites-available/nelsoncerda.com
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name nelsoncerda.com www.nelsoncerda.com;

    root /var/www/nelsoncerda.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nelsoncerda.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL Configuration (HTTPS)

Secure your site with Let's Encrypt.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nelsoncerda.com -d www.nelsoncerda.com
```

## 6. Final Steps

-   **Firewall**: Ensure ports 80 (HTTP) and 443 (HTTPS) are open in the Lightsail networking tab.
-   **PM2 Startup**: Run `pm2 startup` and follow instructions to ensure the API starts on reboot. `pm2 save`.

## 7. Troubleshooting

### Apt Update Errors (404 Not Found)
If you encounter 404 errors when running `sudo apt update` (e.g., `security.debian.org/debian-security bullseye/updates Release`), it means your `sources.list` file or files in `sources.list.d` have outdated repository paths.

To fix this:

1.  Create a fix script on the server:
    ```bash
    nano fix_sources.sh
    ```
2.  Paste the following content:
    ```bash
    #!/bin/bash
    
    # Backup existing sources.list
    sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak
    
    # Create new sources.list content (Minimal stable repositories)
    cat <<EOF | sudo tee /etc/apt/sources.list
    deb http://deb.debian.org/debian bullseye main contrib non-free
    deb-src http://deb.debian.org/debian bullseye main contrib non-free
    
    deb http://deb.debian.org/debian-security/ bullseye-security main contrib non-free
    deb-src http://deb.debian.org/debian-security/ bullseye-security main contrib non-free
    
    deb http://deb.debian.org/debian bullseye-updates main contrib non-free
    deb-src http://deb.debian.org/debian bullseye-updates main contrib non-free
    EOF
    
    # Disable conflicting files in sources.list.d
    if [ -d "/etc/apt/sources.list.d" ]; then
        echo "Checking for conflicting files in /etc/apt/sources.list.d..."
        for file in /etc/apt/sources.list.d/*.list; do
            if [ -f "$file" ]; then
                echo "Disabling $file"
                sudo mv "$file" "${file}.bak"
            fi
        done
    fi
    
    # Update package lists
    echo "Updating package lists..."
    sudo apt update
    ```
3.  Make it executable and run it:
    ```bash
    chmod +x fix_sources.sh
    ./fix_sources.sh
    ```

### PostgreSQL Password Prompt
If `sudo -u postgres psql` still asks for a password:

1.  **Restart the Service**: Changes to `pg_hba.conf` require a restart.
    ```bash
    sudo systemctl restart postgresql
    ```
2.  **Check the Line**: Ensure you edited the `local` connection line for `postgres`.
    ```text
    # TYPE  DATABASE        USER            ADDRESS                 METHOD
    local   all             postgres                                trust
    ```
3.  **Check the Prompt**:
    -   `Password:` = PostgreSQL password (edit `pg_hba.conf` to `trust`).
    -   `[sudo] password for ubuntu:` = System user password (check sudo permissions).

Your application should now be live at https://nelsoncerda.com!
