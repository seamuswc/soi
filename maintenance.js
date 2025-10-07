#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('🔧 SOI Pattaya - Maintenance Mode');
  console.log('==================================');
  console.log('');
  console.log('Usage:');
  console.log('  npm run maintenance on   - Enable maintenance mode');
  console.log('  npm run maintenance off  - Disable maintenance mode');
  console.log('  npm run maintenance status - Check maintenance status');
  console.log('');
  console.log('When maintenance mode is ON:');
  console.log('  - Users see maintenance page instead of the app');
  console.log('  - No new payments can be processed');
  console.log('  - Safe to run updates without interrupting users');
  console.log('');
  process.exit(1);
}

const command = args[0].toLowerCase();
const maintenanceFile = 'maintenance.html';
const nginxConfig = '/etc/nginx/sites-available/soipattaya';

console.log('🔧 SOI Pattaya - Maintenance Mode');
console.log('==================================\n');

// Create maintenance page HTML
const maintenanceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOI Pattaya - Maintenance</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        
        .subtitle {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        
        .message {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        
        .status {
            background: rgba(255, 255, 255, 0.2);
            padding: 1rem;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
        
        .footer {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 1rem;
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .subtitle {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>Maintenance Mode</h1>
        <div class="subtitle">SOI Pattaya is temporarily offline</div>
        
        <div class="message">
            We're currently performing scheduled maintenance to improve your experience. 
            The site will be back online shortly.
        </div>
        
        <div class="status">
            Status: Under Maintenance<br>
            Time: ${new Date().toLocaleString()}<br>
            Expected: Back soon
        </div>
        
        <div class="footer">
            Thank you for your patience!<br>
            <strong>SOI Pattaya</strong>
        </div>
    </div>
</body>
</html>`;

function enableMaintenance() {
  console.log('🔧 Enabling maintenance mode...');
  
  // Create maintenance page
  fs.writeFileSync(maintenanceFile, maintenanceHTML);
  console.log('✅ Maintenance page created');
  
  // Update Nginx config to serve maintenance page
  if (fs.existsSync(nginxConfig)) {
    let nginxContent = fs.readFileSync(nginxConfig, 'utf8');
    
    // Add maintenance location block
    const maintenanceBlock = `
    # Maintenance mode
    location / {
        root /var/www/soipattaya;
        try_files /maintenance.html =404;
    }`;
    
    // Replace the main location block with maintenance block
    nginxContent = nginxContent.replace(
      /location \/ \{[^}]*\}/s,
      maintenanceBlock
    );
    
    fs.writeFileSync(nginxConfig, nginxContent);
    console.log('✅ Nginx config updated for maintenance mode');
    
    // Reload Nginx
    require('child_process').exec('sudo nginx -t && sudo systemctl reload nginx', (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Nginx reload failed:', error.message);
        console.log('   Please run: sudo nginx -t && sudo systemctl reload nginx');
      } else {
        console.log('✅ Nginx reloaded successfully');
      }
    });
  } else {
    console.log('⚠️  Nginx config not found at:', nginxConfig);
    console.log('   Please manually update your web server to serve maintenance.html');
  }
  
  console.log('\n🛡️  Maintenance mode is now ACTIVE');
  console.log('   - Users will see maintenance page');
  console.log('   - No new payments can be processed');
  console.log('   - Safe to run updates now');
  console.log('\n💡 To disable: npm run maintenance off');
}

function disableMaintenance() {
  console.log('🔧 Disabling maintenance mode...');
  
  // Remove maintenance page
  if (fs.existsSync(maintenanceFile)) {
    fs.unlinkSync(maintenanceFile);
    console.log('✅ Maintenance page removed');
  }
  
  // Restore Nginx config
  if (fs.existsSync(nginxConfig)) {
    let nginxContent = fs.readFileSync(nginxConfig, 'utf8');
    
    // Restore original location block
    const originalLocationBlock = `location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }`;
    
    // Replace maintenance block with original
    nginxContent = nginxContent.replace(
      /# Maintenance mode[\s\S]*?location \/ \{[^}]*\}/,
      originalLocationBlock
    );
    
    fs.writeFileSync(nginxConfig, nginxContent);
    console.log('✅ Nginx config restored');
    
    // Reload Nginx
    require('child_process').exec('sudo nginx -t && sudo systemctl reload nginx', (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Nginx reload failed:', error.message);
        console.log('   Please run: sudo nginx -t && sudo systemctl reload nginx');
      } else {
        console.log('✅ Nginx reloaded successfully');
      }
    });
  } else {
    console.log('⚠️  Nginx config not found at:', nginxConfig);
    console.log('   Please manually restore your web server configuration');
  }
  
  console.log('\n✅ Maintenance mode is now DISABLED');
  console.log('   - Site is back online');
  console.log('   - Payments can be processed normally');
}

function checkStatus() {
  const maintenanceExists = fs.existsSync(maintenanceFile);
  
  console.log('📊 Maintenance Status:');
  console.log('====================');
  
  if (maintenanceExists) {
    console.log('🔧 Status: MAINTENANCE MODE ACTIVE');
    console.log('   - Users see maintenance page');
    console.log('   - No payments being processed');
    console.log('   - Safe to run updates');
  } else {
    console.log('✅ Status: NORMAL OPERATION');
    console.log('   - Site is fully functional');
    console.log('   - Payments are being processed');
    console.log('   - Updates may interrupt users');
  }
  
  console.log('\n💡 Commands:');
  console.log('   npm run maintenance on    - Enable maintenance');
  console.log('   npm run maintenance off   - Disable maintenance');
}

// Execute command
switch (command) {
  case 'on':
  case 'enable':
  case 'start':
    enableMaintenance();
    break;
    
  case 'off':
  case 'disable':
  case 'stop':
    disableMaintenance();
    break;
    
  case 'status':
  case 'check':
    checkStatus();
    break;
    
  default:
    console.log('❌ Unknown command:', command);
    console.log('Valid commands: on, off, status');
    process.exit(1);
}
