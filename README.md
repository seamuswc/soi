✅ STEP 1: Update Server & Install Dependencies

sudo apt update && sudo apt upgrade -y
sudo apt install nginx mysql-server php php-fpm php-mysql php-mbstring php-xml php-bcmath php-curl php-zip unzip curl git -y

✅ STEP 2: Secure MySQL & Create Database

sudo mysql_secure_installation

Then:

sudo mysql -u root -p

Inside MySQL prompt:

CREATE DATABASE soipattaya;
CREATE USER 'soipattaya_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON soipattaya.* TO 'soipattaya_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

✅ STEP 3: Install Composer

cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

✅ STEP 4: Clone Your Laravel Project

cd /var/www
sudo git clone https://github.com/yourusername/soipattaya.git
cd soipattaya
sudo chown -R www-data:www-data .

✅ STEP 5: Set Up Laravel

cp .env.example .env
nano .env

Edit DB & app settings:

APP_URL=https://yourdomain.com
DB_CONNECTION=mysql
DB_DATABASE=soipattaya
DB_USERNAME=soipattaya_user
DB_PASSWORD=your_secure_password

SOLANA_WALLET=YourWalletAddress
HELIUS_API_KEY=YourHeliusAPIKey
SOLANA_CLUSTER=mainnet-beta

Then run:

composer install
php artisan key:generate
php artisan migrate
php artisan storage:link

✅ STEP 6: Configure NGINX

sudo nano /etc/nginx/sites-available/soipattaya

Paste this config:

server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/soipattaya/public;
    index index.php index.html;

    access_log /var/log/nginx/soipattaya.access.log;
    error_log /var/log/nginx/soipattaya.error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock; # check version
    }

    location ~ /\.ht {
        deny all;
    }
}

Enable and reload:

sudo ln -s /etc/nginx/sites-available/soipattaya /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

✅ STEP 7: Set Correct Permissions

sudo chown -R www-data:www-data /var/www/soipattaya
sudo chmod -R 755 /var/www/soipattaya

✅ STEP 8: (Optional) Enable HTTPS with Certbot

sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com

