Document Scanner (Mendix) – Self‑Hosted Resources Guide

Overview
This widget integrates Dynamsoft Mobile Document Scanner (MDS) in a Mendix app. It supports fully self‑hosted resources so you can avoid CDNs and/or run offline. This guide explains how to prepare the resources, host them (e.g., on S3), and configure the widget.

Tested Versions
- Widget: this repo (DocumentScanner)
- MDS UI Template: 1.3.1
- Dynamsoft Capture Vision Bundle: 3.0.6001
- Dynamsoft Capture Vision Data: 1.0.1 (templates)

What You Need To Host
Place the following under a base URL of your choice (referred as {baseUrl}):
1) UI template (HTML)
- {baseUrl}/document-scanner.ui.html

2) Engine resources (WASM/JS) – versioned package folders
- {baseUrl}/libs/dynamsoft-capture-vision-bundle@3.0.6001/dist/
  - dcv.bundle.js, dcv.bundle.esm.js, dcv.bundle.mjs, dcv.bundle.worker.js
  - dynamsoft-capture-vision-bundle-ml.wasm, dynamsoft-capture-vision-bundle-ml.js
  - dynamsoft-capture-vision-bundle-ml-simd.wasm, dynamsoft-capture-vision-bundle-ml-simd.js

3) Data templates (required by the engine)
- {baseUrl}/libs/dynamsoft-capture-vision-data@1.0.1/templates/
  - DBR-PresetTemplates.json
  - DDN-PresetTemplates.json
  - (other templates as provided by the package)

Folder Structure Example
{baseUrl}/
├─ document-scanner.ui.html
└─ libs/
   ├─ dynamsoft-capture-vision-bundle@3.0.6001/
   │  └─ dist/
   │     ├─ dcv.bundle.js
   │     ├─ dcv.bundle.esm.js
   │     ├─ dcv.bundle.mjs
   │     ├─ dcv.bundle.worker.js
   │     ├─ dynamsoft-capture-vision-bundle-ml.wasm
   │     ├─ dynamsoft-capture-vision-bundle-ml.js
   │     ├─ dynamsoft-capture-vision-bundle-ml-simd.wasm
   │     └─ dynamsoft-capture-vision-bundle-ml-simd.js
   └─ dynamsoft-capture-vision-data@1.0.1/
      └─ templates/
         ├─ DBR-PresetTemplates.json
         └─ DDN-PresetTemplates.json

Mendix Widget Configuration
You can configure the widget in two ways:

Option A – Use CDN (no configuration)
- Leave both uiPath and engineRootPath empty. The widget loads resources from the default CDN.

Option B – Explicit Paths (self-hosted)
- uiPath = {baseUrl}/document-scanner.ui.html
- engineRootPath = {baseUrl}/libs/

Important: engineRootPath must point to the libs/ base folder only (not deep into a package/dist). The engine will append package@version/dist as needed. If you paste a deeper path, the widget normalizes it back to libs/ to prevent doubled “/dist/…/dist/” URLs.

Example (TypeScript snippet)
```ts
new DocumentScannerSDK({
  license: "YOUR_LICENSE",
  scannerViewConfig: {
    cameraEnhancerUIPath: "https://your.cdn/docscan/document-scanner.ui.html"
  },
  engineResourcePaths: {
    rootDirectory: "https://your.cdn/docscan/libs/"
  }
});
```

S3 (or any static hosting) Checklist
- Public read access for the resource files (403s indicate missing ACL/policy).
- CORS: Allow GET from your app origins.
- HTTPS: Required for camera access and license validation.
- MIME types:
  - .wasm -> application/wasm
  - .js/.mjs -> application/javascript
  - .json -> application/json
  - .html -> text/html
- Caching: Set long Cache-Control for large .wasm/.js assets (e.g., max-age=31536000) to improve performance.

Common Errors & Fixes
- 403 Forbidden on .wasm/.json
  - Cause: Bucket policy/ACL/CORS not allowing public read.
  - Fix: Update S3 bucket policy and CORS; ensure correct MIME types.

- 404 Not Found
  - Cause: Folder structure mismatch or typos in file names.
  - Fix: Ensure versioned folders exactly match (e.g., dynamsoft-capture-vision-bundle@3.0.6001/dist/*).

- Double “/dist/…/dist/” in URLs
  - Cause: engineRootPath set too deep (e.g., libs/dynamsoft-capture-vision-bundle/dist).
  - Fix: Set engineRootPath to the libs/ base only. The widget now also normalizes overly deep paths back to libs/.

- “mapController” or “Resource Initialization Failed”
  - Cause: Engine files not found or blocked.
  - Fix: Verify engineRootPath, UI path, S3 permissions, and exact file layout.

Offline/No-CDN Usage
- Host the above files on any reachable server (or package them with your app) and point uiPath/engineRootPath accordingly.
- For local dev without HTTPS, most browsers only grant camera access on localhost/127.0.0.1.

How These Files Were Prepared
- The repository includes a ready-to-upload folder: `self hosted resources/` containing the required versioned folders and the UI template.
- You can also recreate the structure by installing the npm packages and copying their dist/templates as shown above.

Security Notes
- Scope public access to only these static resource files.
- Keep license keys secret (configure in Mendix as a secure value; do not hard-code in static assets).

Support
- Dynamsoft Docs: `https://www.dynamsoft.com/mobile-document-scanner/docs/web/`
- Open an issue in this repo if you need help with the widget integration.

# DocumentScanner

A Mendix widget for document scanning using the Dynamsoft Document Scanner SDK with support for both CDN and self-hosted resources.

## Features

- Document scanning from camera or file upload
- Automatic border detection
- Image correction and enhancement
- Support for Chinese and custom button text
- Configurable resource hosting (CDN or self-hosted)

## Demo

![Capture](file:///C:/Users/11482/Desktop/New%20folder/capture.jpg)

![Correction](file:///C:/Users/11482/Desktop/New%20folder/correction.jpg)

![Result](file:///C:/Users/11482/Desktop/New%20folder/result.jpg)

## Quick Start

1. Add your **Dynamsoft license key** in widget properties
2. Configure the **scanned image attribute** to store the result
3. Optionally configure custom text labels (defaults to Chinese)
4. **Deploy** - that's it!

## Resource Configuration

### Option 1: Use CDN (Recommended - No Setup Required)

**Just leave UI Path and Engine Root Path empty** - the widget will use jsDelivr CDN automatically.

**What it uses:**
```
UI Template: https://cdn.jsdelivr.net/npm/dynamsoft-document-scanner@1.3.1/dist/document-scanner.ui.html
Engine Resources: https://cdn.jsdelivr.net/npm/
```

---

### Option 2: Self-Hosted Resources

If you need to host resources yourself (for compliance, offline support, or China CDN blocking), follow the detailed instructions below.

## Required Resource Structure

### Visual Folder Structure

When you self-host at: `https://your-server.com/docs/`

```
docs/
├── document-scanner.ui.html          (required at root)
└── libs/                              (required folder)
        ├── core@3.0.6001/            (include version)
        │   └── dist/                  (required subfolder)
        │       ├── Core.js
        │       ├── Core.wasm
        │       └── ...
        ├── license@3.0.6001/
        │   └── dist/
        │       └── ...
        ├── capture-vision-router@3.0.6001/
        │   └── dist/
        │       └── ...
        ├── document-normalizer@3.0.6001/
        │   └── dist/
        │       └── ...
        ├── image-processing@3.0.6001/
        │   └── dist/
        │       └── ...
        └── capture-vision-std@3.0.6001/
            └── dist/
                └── ...
```

### Key Requirements

- `document-scanner.ui.html` at the root of your path
- `libs/` folder containing all packages
- **Must include** `@dynamsoft/` prefix in folder names
- **Must include** `/dist/` subfolder for each package
- Package folders must include version: `package@version/`

### Required Packages (7 total)

**Bundle Package (required):**
1. **dynamsoft-capture-vision-bundle@3.0.6001/dist/** - Main bundle

**Individual Packages (6 required):**
2. **core@3.0.6001/dist/** - Core engine
3. **license@3.0.6001/dist/** - License management
4. **capture-vision-router@3.0.6001/dist/** - Vision router
5. **document-normalizer@3.0.6001/dist/** - Document normalizer
6. **image-processing@3.0.6001/dist/** - Image processing
7. **capture-vision-std@3.0.6001/dist/** - Standard capture

Plus: **document-scanner.ui.html** at the root

**⚠️ Important:** The bundle package is ALSO required, not just the individual packages!

### Path Examples

**S3/CDN:**
```
https://mybucket.s3.amazonaws.com/docs/
```
Expected: `https://mybucket.s3.amazonaws.com/docs/document-scanner.ui.html`

**Local Widget Assets:**
```
/widgets/labull/documentscanner/assets/
```

Set in widget:
```
uiPath = https://mybucket.s3.amazonaws.com/docs/document-scanner.ui.html
engineRootPath = https://mybucket.s3.amazonaws.com/docs/libs/
```

---

## Installation & Setup

### Installing Required Packages

```bash
# Install UI template
npm install dynamsoft-document-scanner@1.3.1

# Install bundle package (includes all individual packages)
npm install dynamsoft-capture-vision-bundle@3.0.6001

# Also install individual packages (in node_modules/@dynamsoft/)
npm install @dynamsoft/core@3.0.6001
npm install @dynamsoft/license@3.0.6001
npm install @dynamsoft/capture-vision-router@3.0.6001
npm install @dynamsoft/document-normalizer@3.0.6001
npm install @dynamsoft/image-processing@3.0.6001
npm install @dynamsoft/capture-vision-std@3.0.6001
```

### Copying Files for Self-Hosted Deployment

```bash
# Copy UI file
cp node_modules/dynamsoft-document-scanner/dist/document-scanner.ui.html /your-deploy-path/

# Copy engine files (IMPORTANT: Keep the folder structure with @dynamsoft and /dist/)
cp -r node_modules/@dynamsoft/core@3.0.6001 /your-deploy-path/libs/
cp -r node_modules/@dynamsoft/license@3.0.6001 /your-deploy-path/libs/
cp -r node_modules/@dynamsoft/capture-vision-router@3.0.6001 /your-deploy-path/libs/
cp -r node_modules/@dynamsoft/document-normalizer@3.0.6001 /your-deploy-path/libs/
cp -r node_modules/@dynamsoft/image-processing@3.0.6001 /your-deploy-path/libs/
cp -r node_modules/@dynamsoft/capture-vision-std@3.0.6001 /your-deploy-path/libs/
```

**⚠️ Critical:** The `/dist/` subfolder inside each package folder is **REQUIRED**!

---

## S3 Setup (Amazon S3 / AWS China)

### Required S3 Configuration

1. **Bucket Policy (Allow Public Read)**
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "PublicReadGetObject",
               "Effect": "Allow",
               "Principal": "*",
               "Action": "s3:GetObject",
               "Resource": "arn:aws:s3:::your-bucket-name/*"
           }
       ]
   }
   ```

2. **Unblock Public Access** - In S3 console, turn OFF "Block all public access"

3. **CORS Configuration**
   ```json
   [
       {
           "AllowedHeaders": ["*"],
           "AllowedMethods": ["GET", "HEAD"],
           "AllowedOrigins": ["*"],
           "ExposeHeaders": ["Content-Type", "Content-Length"],
           "MaxAgeSeconds": 3000
       }
   ]
   ```

4. **Upload Files** - Use AWS CLI or S3 console to upload with correct folder structure

### Testing S3 Access

After configuration, test these URLs in your browser:
```
https://your-bucket.s3.region.amazonaws.com/docs/document-scanner.ui.html
https://your-bucket.s3.region.amazonaws.com/docs/libs/@dynamsoft/core@3.0.6001/dist/Core.js
```

Both should load without 403/404 errors.

---

## Configuration in Mendix Studio Pro

### Basic Settings
- **License**: Your Dynamsoft license key (required)
- **Scanned Image Attribute**: Attribute to store the base64 image

### Text Labels (Optional)
All text labels default to Chinese. Customize as needed:
- Text Take Photo
- Text Close
- Text Retake
- Text Done
- Text Detect Borders
- Text Auto Crop
- Text Smart Capture
- Text Upload Image

### Advanced Settings
- **Resource Path**: 
  - Leave empty for CDN (recommended)
  - Or set custom path for self-hosted

---

## Troubleshooting

### "mapController is not defined" Error

**Problem:** This means your resource folder structure is incorrect.

**Solution:**
1. **Quick Fix** - Clear the Resource Path to use CDN (leave field empty)
2. **Permanent Fix** - Ensure your S3/local structure includes:
   - `libs/@dynamsoft/package@3.0.6001/dist/` folders
   - NOT just `libs/@dynamsoft/package@3.0.6001/` (missing /dist/)

### 403 Forbidden Error

**Problem:** Your S3 bucket or server doesn't allow public access.

**Solution:**
1. Configure S3 bucket policy (see S3 Setup section above)
2. Turn OFF "Block public access" in S3
3. Add CORS configuration
4. Verify permissions

### "Unexpected token '<'" Error

**Problem:** Server returned HTML (error page) instead of JavaScript.

**Solution:**
1. Check Network tab in DevTools
2. Click on the failed request
3. Look at Response - it's likely showing HTML error page
4. Fix the underlying issue (usually 403/404)

### Resources Not Loading

**Checklist:**
- [ ] Resource Path URL is accessible in browser
- [ ] Folder structure includes `/dist/` subfolders
- [ ] Files include `@dynamsoft/` prefix
- [ ] Package folders include version numbers
- [ ] `document-scanner.ui.html` exists at root
- [ ] MIME types correct: `.wasm` → `application/wasm`, `.js` → `application/javascript`
- [ ] Server allows public read access
- [ ] CORS configured (if cross-origin)

### Common Mistakes to Avoid

❌ **Wrong:** Missing `/dist/` subfolder
```
libs/@dynamsoft/core@3.0.6001/Core.js  ← Won't work
```

✅ **Correct:** Including `/dist/` subfolder
```
libs/@dynamsoft/core@3.0.6001/dist/Core.js  ← Works
```

---

## Development

```bash
# Install dependencies
npm install

# Start development
npm start

# Build widget
npm run build
```

## Version Information

- **UI Template**: dynamsoft-document-scanner@1.3.1
- **Engine**: dynamsoft-capture-vision-bundle@3.0.6001

## License

[Your license information]

## Support

- **Dynamsoft SDK**: https://www.dynamsoft.com/
- **Widget Issues**: Check repository issues
- **Resource Hosting**: See troubleshooting section above
