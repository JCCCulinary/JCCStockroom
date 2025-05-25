## Update - 2025-05-25 05:56:29

### Front-End UI
- Replaced static header with flex-based logo layout.
- Ensured logos are mobile-friendly and styled consistently.
- Removed all inline header text to reduce clutter.

### Feature Updates
- Dashboard now reads live inventory values from Google Drive.
- KPI metrics update dynamically on page load.

### Visual Polish
- CSS animation added for header logo entrance effect.
- Button colors aligned with header branding (banner blue).

# JCCiMS Deployment Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Deployment Options](#deployment-options)
   - [Standard Web Hosting](#standard-web-hosting)
   - [Cloud Storage Hosting](#cloud-storage-hosting)
   - [GitHub Pages](#github-pages)
   - [Firebase Hosting](#firebase-hosting)
4. [Build Process](#build-process)
   - [Setting Up the Build Environment](#setting-up-the-build-environment)
   - [Build Configuration](#build-configuration)
   - [Minification](#minification)
   - [Asset Optimization](#asset-optimization)
5. [CI/CD Pipeline](#cicd-pipeline)
   - [GitHub Actions Setup](#github-actions-setup)
   - [Automated Testing](#automated-testing)
   - [Deployment Automation](#deployment-automation)
6. [Hosting Configuration](#hosting-configuration)
   - [Server Requirements](#server-requirements)
   - [HTTPS Configuration](#https-configuration)
   - [Cache Control](#cache-control)
   - [CORS Settings](#cors-settings)
7. [Google Drive API Configuration](#google-drive-api-configuration)
8. [Deployment Checklist](#deployment-checklist)
9. [Rollback Procedures](#rollback-procedures)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Maintenance Mode](#maintenance-mode)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

This document provides comprehensive instructions for deploying the JCC Inventory Management System (JCCiMS) to various hosting environments. It covers the build process, continuous integration/continuous deployment (CI/CD) setup, hosting configuration, and post-deployment verification.

### Purpose of This Document

- Guide the deployment process for JCCiMS
- Document build optimization techniques
- Provide CI/CD pipeline configuration
- Outline hosting requirements and configuration
- Establish deployment verification procedures

### Target Audience

- System administrators
- DevOps engineers
- IT staff
- Developers responsible for deployment

---

## System Requirements

### Hosting Environment Requirements

- Web server capable of serving static files
- HTTPS support (required for Google Drive API)
- Ability to set custom HTTP headers
- Minimum storage: 50MB for application files

### Network Requirements

- Outbound access to Google APIs
- Firewall allowances for:
  - `*.googleapis.com`
  - `accounts.google.com`

### Performance Considerations

- CDN support recommended for improved performance
- Gzip/Brotli compression support recommended
- HTTP/2 support recommended

---

## Deployment Options

JCCiMS is a client-side web application that can be deployed using several different hosting options. Choose the option that best fits your organization's infrastructure and requirements.

### Standard Web Hosting

#### Suitable For

- Organizations with existing web hosting
- Environments where IT manages server infrastructure
- Situations requiring integration with existing websites

#### Deployment Steps

1. **Prepare the deployment package**
   ```bash
   # Run the build process
   npm run build
   
   # The optimized files will be in the 'dist' directory
   ```

2. **Upload files to web server**
   - Use SFTP, SCP, or your hosting control panel to upload files
   - Maintain the directory structure as in the 'dist' folder
   - Ensure all files are uploaded (HTML, CSS, JS, images, etc.)

3. **Configure server**
   - Set appropriate MIME types for all file extensions
   - Configure HTTPS (see HTTPS Configuration section)
   - Set cache control headers (see Cache Control section)

4. **Test the deployment**
   - Verify the application loads correctly
   - Test core functionality
   - Check browser console for errors

### Cloud Storage Hosting

#### Suitable For

- Organizations using cloud infrastructure
- Deployments requiring high scalability
- Situations where server maintenance should be minimized

#### AWS S3 Deployment

1. **Create an S3 bucket**
   - Log in to AWS Management Console
   - Navigate to S3 service
   - Create a new bucket with a relevant name
   - Enable "Static website hosting" in bucket properties

2. **Configure bucket permissions**
   - Create a bucket policy allowing public read access:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
         }
       ]
     }
     ```

3. **Upload build files**
   ```bash
   # Build the project
   npm run build
   
   # Upload to S3 using AWS CLI
   aws s3 sync dist/ s3://YOUR-BUCKET-NAME/ --delete
   ```

4. **Configure CloudFront (recommended)**
   - Create a CloudFront distribution pointing to your S3 bucket
   - Configure HTTPS using AWS Certificate Manager
   - Set appropriate cache behaviors

5. **Update DNS**
   - Create a CNAME record pointing to your CloudFront distribution
   - Or use Route 53 to manage your domain with an A record alias

#### Google Cloud Storage Deployment

1. **Create a Cloud Storage bucket**
   - Go to Google Cloud Console
   - Navigate to Cloud Storage
   - Create a new bucket
   - Set public access if needed

2. **Configure the bucket for website hosting**
   - Enable "Website configuration" in bucket settings
   - Set main page suffix to "index.html"
   - Set error page to "index.html" (for SPA support)

3. **Upload build files**
   ```bash
   # Build the project
   npm run build
   
   # Upload to GCS using gcloud CLI
   gsutil -m cp -r dist/* gs://YOUR-BUCKET-NAME/
   ```

4. **Set up Cloud CDN (recommended)**
   - Create a load balancer in Google Cloud
   - Configure backend to point to your bucket
   - Enable Cloud CDN
   - Configure SSL certificate

### GitHub Pages

#### Suitable For

- Open source projects
- Quick deployments
- Projects with public repositories

#### Deployment Steps

1. **Prepare GitHub repository**
   - Create or use an existing GitHub repository
   - Ensure repository settings allow GitHub Pages

2. **Configure build process for GitHub Pages**
   - Update `package.json` with correct homepage path
     ```json
     {
       "homepage": "https://username.github.io/repository-name"
     }
     ```
   
   - Or for custom domain:
     ```json
     {
       "homepage": "https://your-custom-domain.com"
     }
     ```

3. **Create deployment script**
   - Add `gh-pages` as a dev dependency
     ```bash
     npm install --save-dev gh-pages
     ```
   
   - Add deploy script to `package.json`
     ```json
     {
       "scripts": {
         "deploy": "npm run build && gh-pages -d dist"
       }
     }
     ```

4. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

5. **Configure custom domain (optional)**
   - Go to repository Settings > Pages
   - Enter your custom domain
   - Update DNS records at your domain registrar
   - Create a CNAME file in your repository

### Firebase Hosting

#### Suitable For

- Google ecosystem integration
- Quick deployments with robust tooling
- Projects requiring real-time capabilities in the future

#### Deployment Steps

1. **Set up Firebase**
   - Install Firebase CLI
     ```bash
     npm install -g firebase-tools
     ```
   
   - Log in to Firebase
     ```bash
     firebase login
     ```
   
   - Initialize Firebase in your project
     ```bash
     firebase init
     ```
     Select "Hosting" when prompted for features

2. **Configure Firebase**
   - Edit `firebase.json` to specify the dist directory
     ```json
     {
       "hosting": {
         "public": "dist",
         "ignore": [
           "firebase.json",
           "**/.*",
           "**/node_modules/**"
         ],
         "rewrites": [
           {
             "source": "**",
             "destination": "/index.html"
           }
         ],
         "headers": [
           {
             "source": "**/*.@(js|css)",
             "headers": [
               {
                 "key": "Cache-Control",
                 "value": "max-age=31536000"
               }
             ]
           }
         ]
       }
     }
     ```

3. **Build and deploy**
   ```bash
   # Build the project
   npm run build
   
   # Deploy to Firebase
   firebase deploy
   ```

4. **Configure custom domain (optional)**
   - In Firebase Console, go to Hosting > Add custom domain
   - Follow the verification and DNS configuration steps

---

## Build Process

The build process optimizes the JCCiMS application for production deployment by minimizing file sizes, bundling dependencies, and optimizing assets.

### Setting Up the Build Environment

1. **Prerequisites**
   - Node.js (v14+)
   - npm (v6+) or Yarn
   - Git

2. **Install build dependencies**
   ```bash
   npm install
   ```

### Build Configuration

The build process is configured in the following files:

- **webpack.config.js**: Main configuration for JavaScript bundling
- **postcss.config.js**: CSS processing configuration
- **babel.config.js**: JavaScript transpilation settings
- **package.json**: NPM scripts and dependencies

#### Key build scripts in package.json

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "analyze": "webpack --mode production --analyze"
  }
}
```

### Minification

Minification reduces file sizes by removing unnecessary characters without changing functionality.

#### JavaScript Minification

JCCiMS uses Terser for JavaScript minification through Webpack:

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          output: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  }
};
```

#### CSS Minification

CSS is minified using CSSNano through PostCSS:

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    // ... other plugins
    require('cssnano')({
      preset: ['default', {
        discardComments: {
          removeAll: true
        },
        normalizeWhitespace: true
      }]
    })
  ]
};
```

#### HTML Minification

HTML is minified using html-webpack-plugin:

```javascript
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // ... other config
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      }
    })
  ]
};
```

### Asset Optimization

#### Image Optimization

Images are optimized during the build process:

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65
              },
              optipng: {
                enabled: true
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4
              },
              gifsicle: {
                interlaced: false
              },
              webp: {
                quality: 75
              }
            }
          }
        ]
      }
    ]
  }
};
```

#### Bundle Splitting

Large bundles are split to improve loading performance:

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          }
        }
      }
    }
  }
};
```

### Running the Build

To create a production-ready build:

```bash
# Standard build
npm run build

# Build with bundle analyzer (for optimization)
npm run analyze
```

The optimized files will be generated in the `dist` directory.

---

## CI/CD Pipeline

JCCiMS uses CI/CD to automate testing, building, and deployment processes.

### GitHub Actions Setup

#### Basic CI/CD Workflow

Create a file named `.github/workflows/ci-cd.yml`:

```yaml
name: JCCiMS CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'
        
    - name: Install dependencies
      run: npm ci
        
    - name: Run linting
      run: npm run lint
        
    - name: Run tests
      run: npm test
        
    - name: Build
      run: npm run build
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v2
      with:
        name: build-files
        path: dist

  deploy:
    needs: build-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v2
      with:
        name: build-files
        path: dist
        
    # Deployment step will depend on hosting choice
    # Example for Firebase:
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        channelId: live
        projectId: your-firebase-project-id
```

### Automated Testing

The CI pipeline includes several levels of testing:

1. **Linting**
   ```yaml
   - name: Run linting
     run: npm run lint
   ```

2. **Unit Tests**
   ```yaml
   - name: Run unit tests
     run: npm run test:unit
   ```

3. **Integration Tests**
   ```yaml
   - name: Run integration tests
     run: npm run test:integration
   ```

### Deployment Automation

#### Firebase Deployment

```yaml
- name: Deploy to Firebase
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: '${{ secrets.GITHUB_TOKEN }}'
    firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
    channelId: live
    projectId: your-firebase-project-id
```

#### AWS S3 Deployment

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v1
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Deploy to S3
  run: aws s3 sync dist/ s3://your-bucket-name/ --delete

- name: Invalidate CloudFront
  run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

#### GitHub Pages Deployment

```yaml
- name: Deploy to GitHub Pages
  uses: JamesIves/github-pages-deploy-action@4.1.4
  with:
    branch: gh-pages
    folder: dist
```

### Environment-Specific Configurations

For different environments (dev, staging, production):

```yaml
jobs:
  # ... other jobs
  
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    # ... deployment steps with staging config
  
  deploy-production:
    if: github.ref == 'refs/heads/main'
    # ... deployment steps with production config
```

---

## Hosting Configuration

### Server Requirements

#### Minimal Server Requirements

- Static file serving capability
- HTTPS support
- Ability to set custom HTTP headers

#### Recommended Configuration

- HTTP/2 support
- Gzip/Brotli compression
- CDN integration
- Server-side caching

### HTTPS Configuration

HTTPS is required for Google Drive API integration.

#### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName jccims.yourdomain.com
    DocumentRoot /var/www/jccims
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/chain.crt
    
    # Other directives...
</VirtualHost>
```

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name jccims.yourdomain.com;
    root /var/www/jccims;
    index index.html;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_trusted_certificate /path/to/chain.crt;
    
    # Strong SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
    
    # Other directives...
}
```

### Cache Control

Proper cache settings improve loading performance for repeat visitors.

#### Apache Cache Configuration (.htaccess)

```apache
# Cache HTML files for 5 minutes
<FilesMatch "\.html$">
    Header set Cache-Control "max-age=300"
</FilesMatch>

# Cache CSS and JS files for 1 year
<FilesMatch "\.(css|js)$">
    Header set Cache-Control "max-age=31536000"
</FilesMatch>

# Cache images and fonts for 1 month
<FilesMatch "\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "max-age=2592000"
</FilesMatch>
```

#### Nginx Cache Configuration

```nginx
location ~* \.html$ {
    add_header Cache-Control "max-age=300";
}

location ~* \.(css|js)$ {
    add_header Cache-Control "max-age=31536000";
}

location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
    add_header Cache-Control "max-age=2592000";
}
```

### CORS Settings

Cross-Origin Resource Sharing (CORS) settings are needed for Google Drive API.

#### Apache CORS Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "https://accounts.google.com"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

#### Nginx CORS Configuration

```nginx
location / {
    # ... other directives
    
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://accounts.google.com';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    add_header 'Access-Control-Allow-Origin' 'https://accounts.google.com';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
}
```

---

## Google Drive API Configuration

### Creating a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to APIs & Services > Dashboard
4. Click "ENABLE APIS AND SERVICES"
5. Search for "Google Drive API" and enable it

### Setting Up Authentication

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen
   - Add application name
   - Add authorized domains
   - Set user support email
   - Add necessary scopes (e.g., `.../auth/drive.appdata`)

4. Create OAuth client ID
   - Select "Web application" as application type
   - Add authorized JavaScript origins:
     - Your production URL (e.g., `https://jccims.yourdomain.com`)
     - Your development URL (e.g., `http://localhost:8080`)
   - No need for authorized redirect URIs for web applications

5. Note the Client ID, you'll need it for your application

### Updating Application Configuration

1. Update the Google Drive client ID in your application
   - Open `scripts/storage/googleDrive.js`
   - Replace the placeholder with your actual client ID:
     ```javascript
     const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
     ```

2. Build the application with the updated configuration
   ```bash
   npm run build
   ```

### Testing the Google Drive Integration

After deployment, verify the Google Drive integration:

1. Access the application
2. Click "Connect to Google Drive"
3. Authorize the application when prompted
4. Verify the connection status shows as connected
5. Test saving and loading data

---

## Deployment Checklist

Use this checklist before and after deployment to ensure everything is properly configured:

### Pre-Deployment Checklist

- [ ] Run all tests and verify they pass
- [ ] Build the application with production settings
- [ ] Verify Google Drive client ID is correctly configured
- [ ] Check all external dependencies and CDN links
- [ ] Validate HTML, CSS, and JavaScript
- [ ] Run performance audit (Lighthouse or similar)
- [ ] Check cross-browser compatibility
- [ ] Prepare backup of previous version (if updating)

### Deployment Checklist

- [ ] Upload all files to the hosting environment
- [ ] Configure server settings (HTTPS, cache, CORS)
- [ ] Verify all files were transferred correctly
- [ ] Check file permissions
- [ ] Update DNS if needed

### Post-Deployment Checklist

- [ ] Verify the application loads correctly
- [ ] Check browser console for errors
- [ ] Test Google Drive integration
- [ ] Verify core functionality works
  - [ ] Inventory management
  - [ ] Hot counts
  - [ ] Orders
  - [ ] Import/export
- [ ] Test on different browsers and devices
- [ ] Verify HTTPS is working properly
- [ ] Check loading performance
- [ ] Monitor error logs

---

## Rollback Procedures

If issues are found after deployment, follow these procedures to roll back to a previous version:

### Standard Web Hosting Rollback

1. **Backup the current deployment**
   ```bash
   # On server, create a backup of the problematic deployment
   cp -r /var/www/jccims /var/www/jccims-backup-$(date +%Y%m%d)
   ```

2. **Restore previous version**
   ```bash
   # Replace with backup
   rm -rf /var/www/jccims/*
   cp -r /var/www/jccims-previous/* /var/www/jccims/
   ```

3. **Verify the rollback**
   - Check that the application loads correctly
   - Test core functionality

### S3/CloudFront Rollback

1. **Revert to previous version using versioning**
   ```bash
   # List object versions
   aws s3api list-object-versions --bucket YOUR-BUCKET-NAME --prefix index.html
   
   # Restore specific version
   aws s3api copy-object --bucket YOUR-BUCKET-NAME --copy-source YOUR-BUCKET-NAME/index.html?versionId=VERSION-ID --key index.html
   ```

2. **Alternatively, deploy the previous build**
   ```bash
   # Deploy previous build
   aws s3 sync previous-build/ s3://YOUR-BUCKET-NAME/ --delete
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id DISTRIBUTION-ID --paths "/*"
   ```

### GitHub Pages Rollback

1. **Revert the commit in the gh-pages branch**
   ```bash
   git checkout gh-pages
   git revert HEAD
   git push origin gh-pages
   ```

2. **Alternatively, force push the previous state**
   ```bash
   git checkout gh-pages
   git reset --hard PREVIOUS-COMMIT-HASH
   git push --force origin gh-pages
   ```

### Firebase Hosting Rollback

1. **List previous deployments**
   ```bash
   firebase hosting:versions:list
   ```

2. **Rollback to a specific version**
   ```bash
   firebase hosting:clone SOURCE_VERSION_ID:SOURCE_SITE_ID TARGET_VERSION_ID:TARGET_SITE_ID
   ```

3. **Or use the Firebase Console**
   - Go to Firebase Console > Hosting
   - Find previous deployment
   - Click "Rollback"

---

## Post-Deployment Verification

### Functional Testing

1. **Core Functionality**
   - Verify navigation between modules
   - Test CRUD operations on inventory items
   - Perform a hot count
   - Create and manage orders
   - Test import/export functionality

2. **Google Drive Integration**
   - Connect to Google Drive
   - Save data to Google Drive
   - Load data from Google Drive
   - Test synchronization

3. **Offline Functionality**
   - Test application with network disconnected
   - Verify data can be saved locally
   - Reconnect and verify synchronization

### Performance Testing

1. **Load Time Testing**
   - Measure initial page load time
   - Test page load on different connections
   - Check time-to-interactive metrics

2. **Resource Utilization**
   - Monitor memory usage in browser
   - Check CPU utilization during operations
   - Verify network transfer sizes

3. **Lighthouse Audit**
   - Run Lighthouse audit in Chrome DevTools
   - Identify and address performance issues
   - Verify Core Web Vitals metrics

### Browser Compatibility

Test the application on these browsers:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Android Chrome)

---

## Maintenance Mode

When performing updates or maintenance, you may need to put the application in maintenance mode.

### Implementing Maintenance Mode

1. **Create a maintenance page**
   Create a file named `maintenance.html` with a message indicating the system is under maintenance.

2. **Redirect traffic during maintenance**

   **Apache Configuration**
   ```apache
   # In .htaccess or server config
   RewriteEngine On
   # Check if maintenance flag file exists
   RewriteCond %{DOCUMENT_ROOT}/maintenance.flag -f
   # Exclude your IP for testing
   RewriteCond %{REMOTE_ADDR} !^123\.456\.789\.0$
   # Redirect all requests to maintenance page
   RewriteCond %{REQUEST_URI} !^/maintenance\.html$
   RewriteRule ^(.*)$ /maintenance.html [R=307,L]
   ```

   **Nginx Configuration**
   ```nginx
   # In server block
   if (-f $document_root/maintenance.flag) {
       set $maintenance 1;
   }
   
   # Allow your IP
   if ($remote_addr = "123.456.789.0") {
       set $maintenance 0;
   }
   
   # Don't redirect maintenance page itself
   if ($request_uri = /maintenance.html) {
       set $maintenance 0;
   }
   
   if ($maintenance = 1) {
       return 307 /maintenance.html;
   }
   ```

3. **Toggle maintenance mode**
   - To enable: Create the flag file `touch /path/to/webroot/maintenance.flag`
   - To disable: Remove the flag file `rm /path/to/webroot/maintenance.flag`

### Scheduled Maintenance Announcement

1. Before planned maintenance, display a banner in the application
2. Add a countdown or specific time information
3. Send notifications to admin users if applicable

---

## Troubleshooting

### Common Deployment Issues

#### 1. Application Doesn't Load After Deployment

**Symptoms:**
- Blank page
- 404 errors
- JavaScript console errors

**Potential Causes and Solutions:**

- **Missing Files**
  - Verify all files were uploaded
  - Check file permissions (should be readable by web server)
  - Ensure index.html is in the root directory

- **Path Issues**
  - Check base path configuration
  - Verify all paths in HTML are correct

- **CORS Errors**
  - Check browser console for CORS errors
  - Verify server is configured with proper CORS headers

#### 2. Google Drive Integration Fails

**Symptoms:**
- Cannot connect to Google Drive
- Authentication errors
- Permission denied errors

**Potential Causes and Solutions:**

- **Incorrect Client ID**
  - Verify the client ID is correct in the application config
  - Ensure the client ID is from the correct Google Cloud project

- **Missing or Incorrect Origins**
  - Check that your domain is listed in authorized JavaScript origins
  - Ensure you're using HTTPS if that's what's configured

- **API Not Enabled**
  - Verify Google Drive API is enabled in the Google Cloud Console

#### 3. Performance Issues

**Symptoms:**
- Slow page loading
- UI lag during interaction
- High resource utilization

**Potential Causes and Solutions:**

- **Unoptimized Assets**
  - Verify images are properly optimized
  - Check if minification was applied correctly

- **Missing Caching**
  - Verify cache headers are set correctly
  - Check browser cache usage

- **Network Issues**
  - Test connection speed to server
  - Consider implementing a CDN

### Debugging Techniques

1. **Browser Developer Tools**
   - Use the Network tab to check resource loading
   - Use the Console to check for JavaScript errors
   - Use the Application tab to inspect localStorage

2. **Server Logs**
   - Check web server error logs
   - Look for 404, 500, or other HTTP errors

3. **HTTP Headers Inspection**
   - Use tools like curl to check headers:
     ```bash
     curl -I https://your-jccims-domain.com
     ```
   - Verify CORS, cache, and security headers

4. **Performance Profiling**
   - Use Chrome DevTools Performance tab
   - Record and analyze loading and interaction
   - Look for bottlenecks in resource loading or JavaScript execution

This deployment documentation provides comprehensive guidance for deploying the JCCiMS application to various environments. By following these instructions, you can ensure a smooth, optimized deployment with proper configuration for security, performance, and reliability.

---

## Environment-Specific Configuration

Different deployment environments may require different configurations. Here's how to handle environment-specific settings.

### Configuration Files

The JCCiMS application uses a configuration system that loads different settings based on the environment:

```javascript
// config/config.js
const environments = {
  development: {
    apiUrl: 'http://localhost:8080',
    googleClientId: 'DEV_CLIENT_ID',
    debugMode: true,
    syncInterval: 5 * 60 * 1000 // 5 minutes
  },
  staging: {
    apiUrl: 'https://staging.jccims.yourdomain.com',
    googleClientId: 'STAGING_CLIENT_ID',
    debugMode: true,
    syncInterval: 15 * 60 * 1000 // 15 minutes
  },
  production: {
    apiUrl: 'https://jccims.yourdomain.com',
    googleClientId: 'PRODUCTION_CLIENT_ID',
    debugMode: false,
    syncInterval: 30 * 60 * 1000 // 30 minutes
  }
};

// Determine which environment to use
const env = process.env.NODE_ENV || 'development';
const config = environments[env];

export default config;
```

### Environment Variables

You can use environment variables to customize the build for different environments:

1. **Create environment files**
   - `.env.development`
   - `.env.staging` 
   - `.env.production`

2. **Example environment file content**
   ```
   NODE_ENV=production
   GOOGLE_CLIENT_ID=your-production-client-id
   SYNC_INTERVAL=1800000
   ```

3. **Load environment variables during build**
   ```javascript
   // webpack.config.js
   const Dotenv = require('dotenv-webpack');

   module.exports = {
     // ... other config
     plugins: [
       new Dotenv({
         path: `./.env.${process.env.NODE_ENV || 'development'}`
       })
     ]
   };
   ```

4. **Build with specific environment**
   ```bash
   # For development
   NODE_ENV=development npm run build
   
   # For staging
   NODE_ENV=staging npm run build
   
   # For production
   NODE_ENV=production npm run build
   ```

---

## Security Hardening

Beyond basic configuration, additional security measures can improve the application's security posture.

### Content Security Policy (CSP)

Implement a Content Security Policy to prevent XSS and other code injection attacks:

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set Content-Security-Policy "default-src 'self'; script-src 'self' https://apis.google.com; connect-src 'self' https://*.googleapis.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src https://accounts.google.com;"
</IfModule>
```

#### Nginx Configuration

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://apis.google.com; connect-src 'self' https://*.googleapis.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-src https://accounts.google.com;";
```

### HTTP Strict Transport Security (HSTS)

Enforce HTTPS connections:

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>
```

#### Nginx Configuration

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### X-Content-Type-Options

Prevent MIME type sniffing:

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
</IfModule>
```

#### Nginx Configuration

```nginx
add_header X-Content-Type-Options "nosniff" always;
```

### Referrer Policy

Control the information sent in the Referer header:

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set Referrer-Policy "same-origin"
</IfModule>
```

#### Nginx Configuration

```nginx
add_header Referrer-Policy "same-origin" always;
```

### Feature Policy

Restrict which browser features the application can use:

#### Apache Configuration (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set Feature-Policy "camera 'none'; microphone 'none'; geolocation 'none'"
</IfModule>
```

#### Nginx Configuration

```nginx
add_header Feature-Policy "camera 'none'; microphone 'none'; geolocation 'none'" always;
```

---

## Advanced CI/CD Configurations

### Multi-Environment Pipeline

This enhanced GitHub Actions workflow supports multiple environments:

```yaml
name: JCCiMS Multi-Environment CI/CD

on:
  push:
    branches: [ develop, staging, main ]
  pull_request:
    branches: [ develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm ci
      - name: Run linting
        run: npm run lint
      - name: Run tests
        run: npm test

  build-and-deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm ci
      - name: Build for development
        run: |
          NODE_ENV=development npm run build
      # Development deployment steps...

  build-and-deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm ci
      - name: Build for staging
        run: |
          NODE_ENV=staging npm run build
      # Staging deployment steps...

  build-and-deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm ci
      - name: Build for production
        run: |
          NODE_ENV=production npm run build
      # Production deployment steps...
```

### Slack Notifications

Add Slack notifications to your CI/CD pipeline:

```yaml
- name: Notify Slack on Success
  if: success()
  uses: rtCamp/action-slack-notify@v2
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
    SLACK_CHANNEL: deployments
    SLACK_COLOR: good
    SLACK_TITLE: Successful Deployment
    SLACK_MESSAGE: 'JCCiMS has been successfully deployed to ${{ github.ref }}'

- name: Notify Slack on Failure
  if: failure()
  uses: rtCamp/action-slack-notify@v2
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
    SLACK_CHANNEL: deployments
    SLACK_COLOR: danger
    SLACK_TITLE: Failed Deployment
    SLACK_MESSAGE: 'JCCiMS deployment to ${{ github.ref }} has failed'
```

### Automated Versioning

Implement semantic versioning in your CI/CD pipeline:

```yaml
- name: Bump version and create tag
  id: versioning
  uses: phips28/gh-action-bump-version@master
  with:
    tag-prefix: 'v'
    minor-wording: 'feat,feature'
    major-wording: 'BREAKING,major'
    patch-wording: 'fix,patch'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Create Release
  uses: actions/create-release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ steps.versioning.outputs.newTag }}
    release_name: Release ${{ steps.versioning.outputs.newTag }}
    draft: false
    prerelease: false
```

---

## Monitoring and Logging

### Error Tracking

Implement client-side error tracking to detect issues in production:

1. **Install Sentry**
   ```bash
   npm install @sentry/browser
   ```

2. **Initialize Sentry in your application**
   ```javascript
   // app.js
   import * as Sentry from '@sentry/browser';

   Sentry.init({
     dsn: 'YOUR_SENTRY_DSN',
     environment: process.env.NODE_ENV,
     release: 'jccims@1.0.0', // Use your version
     integrations: [
       new Sentry.Integrations.GlobalHandlers({
         onerror: true,
         onunhandledrejection: true,
       })
     ],
     // Only enable in production
     enabled: process.env.NODE_ENV === 'production'
   });
   ```

### Performance Monitoring

Implement Real User Monitoring (RUM) to track application performance:

```javascript
// After Sentry initialization
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  // ... other options
  integrations: [
    // ... other integrations
    new BrowserTracing()
  ],
  tracesSampleRate: 0.1 // Sample 10% of transactions
});

// Measure important user interactions
function measureCriticalAction() {
  const transaction = Sentry.startTransaction({
    name: 'Critical User Action'
  });
  
  // Set transaction as current
  Sentry.configureScope(scope => {
    scope.setSpan(transaction);
  });
  
  // Perform the action...
  
  // Finish the transaction
  transaction.finish();
}
```

### Usage Analytics

Implement Google Analytics or a privacy-focused alternative like Plausible:

```html
<!-- In index.html -->
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>

<!-- OR Plausible (privacy-focused) -->
<script defer data-domain="jccims.yourdomain.com" src="https://plausible.io/js/plausible.js"></script>
```

### Custom Event Tracking

Implement custom event tracking for important user actions:

```javascript
// Track inventory item creation
function trackItemCreated(item) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'item_created', {
      'category': 'Inventory',
      'item_category': item.category,
      'item_name': item.name
    });
  }
}

// Track hot count completion
function trackHotCountCompleted(count) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'hot_count_completed', {
      'category': 'Hot Counts',
      'count_type': count.type,
      'items_counted': count.items.length
    });
  }
}
```

---

## Performance Optimization

### Lazy Loading

Implement lazy loading for modules that aren't needed on initial page load:

```javascript
// Before optimization
import HotCountsModule from './modules/hotcounts.js';
import OrdersModule from './modules/orders.js';

// After optimization - dynamic imports
async function loadHotCountsModule() {
  const { default: HotCountsModule } = await import('./modules/hotcounts.js');
  return HotCountsModule;
}

async function loadOrdersModule() {
  const { default: OrdersModule } = await import('./modules/orders.js');
  return OrdersModule;
}

// Use when needed
document.querySelector('.nav-link[data-module="hotcounts"]').addEventListener('click', async () => {
  const HotCountsModule = await loadHotCountsModule();
  HotCountsModule.initialize();
});
```

### Resource Hints

Add resource hints to improve loading performance:

```html
<!-- In index.html -->
<!-- Preconnect to Google APIs -->
<link rel="preconnect" href="https://apis.google.com">
<link rel="preconnect" href="https://accounts.google.com">

<!-- Prefetch modules that might be needed soon -->
<link rel="prefetch" href="modules/hotcounts.js">
<link rel="prefetch" href="modules/orders.js">

<!-- Preload critical resources -->
<link rel="preload" href="styles/main.css" as="style">
<link rel="preload" href="scripts/app.js" as="script">
```

### Image Optimization Best Practices

1. **Use WebP format with fallbacks**
   ```html
   <picture>
     <source srcset="image.webp" type="image/webp">
     <img src="image.jpg" alt="Description">
   </picture>
   ```

2. **Responsive images**
   ```html
   <img 
     src="small-image.jpg" 
     srcset="small-image.jpg 400w, medium-image.jpg 800w, large-image.jpg 1200w" 
     sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px" 
     alt="Description"
   >
   ```

3. **Lazy loading images**
   ```html
   <img src="image.jpg" loading="lazy" alt="Description">
   ```

### Progressive Web App (PWA)

Implement PWA capabilities for better offline experience:

1. **Create a Web App Manifest**
   ```json
   // public/manifest.json
   {
     "name": "JCC Inventory Management System",
     "short_name": "JCCiMS",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#4285f4",
     "icons": [
       {
         "src": "icons/icon-72x72.png",
         "sizes": "72x72",
         "type": "image/png"
       },
       {
         "src": "icons/icon-96x96.png",
         "sizes": "96x96",
         "type": "image/png"
       },
       {
         "src": "icons/icon-128x128.png",
         "sizes": "128x128",
         "type": "image/png"
       },
       {
         "src": "icons/icon-144x144.png",
         "sizes": "144x144",
         "type": "image/png"
       },
       {
         "src": "icons/icon-152x152.png",
         "sizes": "152x152",
         "type": "image/png"
       },
       {
         "src": "icons/icon-192x192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "icons/icon-384x384.png",
         "sizes": "384x384",
         "type": "image/png"
       },
       {
         "src": "icons/icon-512x512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

2. **Add manifest to HTML**
   ```html
   <link rel="manifest" href="/manifest.json">
   <meta name="theme-color" content="#4285f4">
   ```

3. **Register a Service Worker**
   ```javascript
   // In app.js
   if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/service-worker.js')
         .then(registration => {
           console.log('Service Worker registered:', registration);
         })
         .catch(error => {
           console.log('Service Worker registration failed:', error);
         });
     });
   }
   ```

4. **Create a Service Worker**
   ```javascript
   // public/service-worker.js
   const CACHE_NAME = 'jccims-cache-v1';
   const urlsToCache = [
     '/',
     '/index.html',
     '/styles/main.css',
     '/scripts/app.js',
     '/scripts/modules/inventory.js',
     // Add other critical assets
   ];

   self.addEventListener('install', event => {
     event.waitUntil(
       caches.open(CACHE_NAME)
         .then(cache => {
           return cache.addAll(urlsToCache);
         })
     );
   });

   self.addEventListener('fetch', event => {
     event.respondWith(
       caches.match(event.request)
         .then(response => {
           // Cache hit - return response
           if (response) {
             return response;
           }
           return fetch(event.request);
         })
     );
   });
   ```

---

## Deployment Automation Scripts

### Build and Deploy Script

Create a comprehensive build and deploy script:

```bash
#!/bin/bash
# build_deploy.sh - Build and deploy JCCiMS

# Configuration
ENV=${1:-production}  # Default to production if no argument provided
SERVER_USER="deploy"
SERVER_HOST="jccims.yourdomain.com"
REMOTE_PATH="/var/www/jccims"
BUILD_DIR="./dist"

# Display settings
echo "===== JCCiMS Build & Deploy ====="
echo "Environment: $ENV"
echo "Target: $SERVER_USER@$SERVER_HOST:$REMOTE_PATH"
echo "=================================="

# Build the application
echo "Building application for $ENV environment..."
NODE_ENV=$ENV npm run build

if [ $? -ne 0 ]; then
  echo "Build failed! Aborting deployment."
  exit 1
fi

echo "Build successful!"

# Create a backup on the server
echo "Creating backup on server..."
ssh $SERVER_USER@$SERVER_HOST "cp -r $REMOTE_PATH ${REMOTE_PATH}_backup_\$(date +%Y%m%d_%H%M%S)"

# Deploy to server
echo "Deploying to server..."
rsync -avz --delete $BUILD_DIR/ $SERVER_USER@$SERVER_HOST:$REMOTE_PATH

if [ $? -ne 0 ]; then
  echo "Deployment failed!"
  exit 1
fi

echo "Deployment successful!"

# Run post-deployment verification
echo "Running verification tests..."
./verify_deployment.sh $ENV

if [ $? -ne 0 ]; then
  echo "Verification failed! Consider rollback."
  exit 1
fi

echo "Verification successful! Deployment complete."
```

### Verification Script

Create a verification script to test deployment:

```bash
#!/bin/bash
# verify_deployment.sh - Verify JCCiMS deployment

# Configuration
ENV=${1:-production}  # Default to production if no argument provided
case $ENV in
  production)
    BASE_URL="https://jccims.yourdomain.com"
    ;;
  staging)
    BASE_URL="https://staging.jccims.yourdomain.com"
    ;;
  development)
    BASE_URL="http://dev.jccims.yourdomain.com"
    ;;
  *)
    echo "Unknown environment: $ENV"
    exit 1
    ;;
esac

# Function to check HTTP status
check_url() {
  local url=$1
  local expected_status=${2:-200}
  
  echo "Checking $url (expecting $expected_status)..."
  
  status=$(curl -s -o /dev/null -w "%{http_code}" $url)
  
  if [ "$status" = "$expected_status" ]; then
    echo "✅ Success: $url returned $status"
    return 0
  else
    echo "❌ Failure: $url returned $status (expected $expected_status)"
    return 1
  fi
}

# Check main application resources
check_url "$BASE_URL"
check_url "$BASE_URL/index.html"
check_url "$BASE_URL/styles/main.css"
check_url "$BASE_URL/scripts/app.js"

# Check for required HTTP headers
echo "Checking HTTP Security Headers..."
headers=$(curl -s -I $BASE_URL)

check_header() {
  local header=$1
  
  if echo "$headers" | grep -q "$header"; then
    echo "✅ $header is present"
  else
    echo "❌ $header is missing"
    return 1
  fi
}

check_header "Content-Security-Policy"
check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"

echo "Verification completed!"
```

### Rollback Script

Create a rollback script for emergency situations:

```bash
#!/bin/bash
# rollback.sh - Rollback JCCiMS deployment

# Configuration
SERVER_USER="deploy"
SERVER_HOST="jccims.yourdomain.com"
REMOTE_PATH="/var/www/jccims"

# List available backups
echo "Available backups:"
ssh $SERVER_USER@$SERVER_HOST "ls -la ${REMOTE_PATH}_backup_*"

# Ask which backup to restore
read -p "Enter backup suffix (e.g., 20250521_120000): " BACKUP_SUFFIX

if [ -z "$BACKUP_SUFFIX" ]; then
  echo "No backup specified. Aborting."
  exit 1
fi

BACKUP_PATH="${REMOTE_PATH}_backup_${BACKUP_SUFFIX}"

# Verify backup exists
ssh $SERVER_USER@$SERVER_HOST "if [ ! -d \"$BACKUP_PATH\" ]; then echo 'Backup not found!'; exit 1; fi"

if [ $? -ne 0 ]; then
  echo "Backup not found. Aborting."
  exit 1
fi

# Perform rollback
echo "Rolling back to backup ${BACKUP_SUFFIX}..."
ssh $SERVER_USER@$SERVER_HOST "mv $REMOTE_PATH ${REMOTE_PATH}_pre_rollback_\$(date +%Y%m%d_%H%M%S) && cp -r $BACKUP_PATH $REMOTE_PATH"

if [ $? -ne 0 ]; then
  echo "Rollback failed!"
  exit 1
fi

echo "Rollback successful!"
```

---

## Conclusion

This deployment documentation provides a comprehensive reference for deploying and maintaining the JCCiMS application. By following these guidelines, you can ensure a robust, secure, and performant deployment.

Remember to:
- Always test the application thoroughly before deployment
- Use the appropriate build configuration for each environment
- Implement security best practices
- Set up monitoring and error tracking
- Establish a reliable backup and rollback procedure

For assistance with deployment issues, refer to the troubleshooting section or contact the development team.