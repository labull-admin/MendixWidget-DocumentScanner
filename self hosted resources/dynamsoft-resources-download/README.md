Self-Hosted Dynamsoft Resources

- UI: document-scanner.ui.html
- Libs: libs/{package@version}/dist/*
- Packages: dynamsoft-capture-vision-bundle@3.0.6001, dynamsoft-capture-vision-data@3.0.6001

Configure in code:
- engineResourcePaths.rootDirectory -> {baseUrl}/libs/
- scannerViewConfig.cameraEnhancerUIPath -> {baseUrl}/document-scanner.ui.html

Example URLs (copy this folder to S3 as-is):
- {baseUrl}/document-scanner.ui.html
- {baseUrl}/libs/dynamsoft-capture-vision-bundle@3.0.6001/dist/dcv.bundle.worker.js
- {baseUrl}/libs/dynamsoft-capture-vision-bundle@3.0.6001/dist/dynamsoft-capture-vision-bundle-ml.wasm
