import { ReactElement, createElement, useRef, useCallback, useEffect } from "react";
import { DocumentScannerContainerProps } from "../typings/DocumentScannerProps";
import DocumentScannerSDK from "./sdk/DocumentScanner";

import "./ui/DocumentScanner.css";

// Default Chinese text
const DEFAULT_TEXTS = {
    textTakePhoto: "拍照",
    textClose: "关闭",
    textRetake: "重拍",
    textDone: "完成",
    textDetectBorders: "检测边框",
    textAutoCrop: "自动裁剪",
    textSmartCapture: "智能捕获",
    textUploadImage: "上传图片"
};

export function DocumentScanner({
    license,
    heightPercentage,
    scannedImageAttribute,
    onDone,
    class: className,
    style,
    textTakePhoto,
    textClose,
    textRetake,
    textDone,
    textDetectBorders,
    textAutoCrop,
    textSmartCapture,
    textUploadImage,
    uiPath,
    engineRootPath
}: DocumentScannerContainerProps): ReactElement {
    // Get text values with Chinese defaults (ready for future SDK integration)
    const texts = {
        takePhoto: textTakePhoto?.value || DEFAULT_TEXTS.textTakePhoto,
        close: textClose?.value || DEFAULT_TEXTS.textClose,
        retake: textRetake?.value || DEFAULT_TEXTS.textRetake,
        done: textDone?.value || DEFAULT_TEXTS.textDone,
        detectBorders: textDetectBorders?.value || DEFAULT_TEXTS.textDetectBorders,
        autoCrop: textAutoCrop?.value || DEFAULT_TEXTS.textAutoCrop,
        smartCapture: textSmartCapture?.value || DEFAULT_TEXTS.textSmartCapture,
        uploadImage: textUploadImage?.value || DEFAULT_TEXTS.textUploadImage
    };

    // This will be used when SDK supports custom text
    void texts;
    const containerRef = useRef<HTMLDivElement>(null);
    const scannerInstanceRef = useRef<DocumentScannerSDK | null>(null);

    const handleScanResult = useCallback(
        async (result: any) => {
            try {
                // Get the corrected image canvas
                const canvas = result.correctedImageResult.toCanvas();

                // Convert canvas to base64 string with reduced quality to avoid size limits
                const base64String = canvas.toDataURL("image/jpeg", 0.7);
                console.log("Scanned image converted to base64:", base64String.substring(0, 100) + "...");

                // Store the base64 string in the scannedImageAttribute property
                if (scannedImageAttribute) {
                    scannedImageAttribute.setValue(base64String);
                }

                // Execute the onDone action if provided
                if (onDone && onDone.canExecute) {
                    await onDone.execute();
                }
            } catch (error) {
                console.error("Failed to handle scan result:", error);
            }
        },
        [scannedImageAttribute, onDone]
    );

    const startScanning = useCallback(async () => {
        if (!containerRef.current) {
            return;
        }

        try {
            // Cleanup previous scanner instance if exists
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.dispose();
            }

            // Build resource configuration using explicit paths only (CDN if empty)
            const resourceConfig: any = {};
            const explicitUIPath = uiPath?.value?.trim?.() || "";
            let explicitEngineRoot = engineRootPath?.value?.trim?.() || "";

            // Normalize engine root to the libs/ base; avoid pointing into a specific package/dist
            if (explicitEngineRoot) {
                // Ensure forward slashes for normalization checks
                const normalized = explicitEngineRoot.replace(/\\/g, "/");
                const libsIdx = normalized.toLowerCase().indexOf("/libs/");
                if (libsIdx >= 0) {
                    explicitEngineRoot = normalized.substring(0, libsIdx + "/libs/".length);
                } else if (/dynamsoft-|@|\/dist\//i.test(normalized)) {
                    // If user pasted a deeper path, back up to its parent and warn in console
                    const parts = normalized.split("/");
                    const libsPos = parts.findIndex(p => p.toLowerCase() === "libs");
                    if (libsPos >= 0) {
                        explicitEngineRoot = parts.slice(0, libsPos + 1).join("/") + "/";
                    }
                }
            }

            if (explicitEngineRoot) {
                resourceConfig.engineResourcePaths = {
                    rootDirectory: explicitEngineRoot.endsWith("/") ? explicitEngineRoot : explicitEngineRoot + "/"
                };
            }

            const resolvedUIPath = explicitUIPath || "";

            if (resolvedUIPath) {
                resourceConfig.scannerViewConfig = {
                    ...resourceConfig.scannerViewConfig,
                    cameraEnhancerUIPath: resolvedUIPath
                };
            }

            // Log resource configuration for debugging
            if (explicitUIPath || explicitEngineRoot) {
                console.log("[DocumentScanner] Using custom resources");
                console.log("[DocumentScanner] UI Path:", resourceConfig.scannerViewConfig?.cameraEnhancerUIPath);
                console.log("[DocumentScanner] Engine Path:", resourceConfig.engineResourcePaths);
                console.log("[DocumentScanner] Expected resource structure:");
                console.log("  - UI: document-scanner.ui.html at root");
                console.log(
                    "  - Libs: libs/package@version/dist/ files (e.g., dynamsoft-capture-vision-bundle@3.0.6001/dist)"
                );
            } else {
                console.log("[DocumentScanner] Using default CDN resources");
            }

            const scannerInstance = new DocumentScannerSDK({
                license: license?.value || "", // Use provided license
                container: containerRef.current,
                showCorrectionView: true,
                showResultView: true,
                scannerViewConfig: {
                    enableAutoCropMode: true,
                    enableSmartCaptureMode: true,
                    ...resourceConfig.scannerViewConfig
                },
                ...(resourceConfig.engineResourcePaths && {
                    engineResourcePaths: resourceConfig.engineResourcePaths
                })
            });

            console.log("[DocumentScanner] Initializing scanner...");
            const { components } = await scannerInstance.initialize();
            console.log("[DocumentScanner] Scanner initialized successfully");

            // Show the scanner view container
            if (containerRef.current) {
                const scannerContainer = containerRef.current.querySelector(".dds-scanner-view-container");
                if (scannerContainer) {
                    (scannerContainer as HTMLElement).style.display = "block";
                }
            }

            // Launch the scanner to handle the complete flow
            // This will open camera, handle photo capture, correction, and result view
            if (components.scannerView) {
                const result = await scannerInstance.launch();

                // Handle the result: convert to base64 and update Mendix value
                if (result?.correctedImageResult) {
                    await handleScanResult(result);
                }
            }

            scannerInstanceRef.current = scannerInstance;
        } catch (error) {
            console.error("[DocumentScanner] Failed to initialize:", error);

            // Provide helpful error messages for common issues
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes("mapController")) {
                console.error("[DocumentScanner] mapController error detected.");
                console.error("This means Dynamsoft resources aren't loading correctly.");
                console.error("Solutions:");
                console.error("  1. Clear Resource Path to use CDN (easiest)");
                console.error("  2. Fix S3 folder structure (need @dynamsoft/package@version/dist/)");
                console.error("  3. See MAPCONTROLLER_ERROR_FIX.md for details");
            } else if (errorMessage.includes("403")) {
                console.error("[DocumentScanner] Access denied. Check S3 bucket permissions:");
                console.error("  1. Ensure bucket policy allows public read access");
                console.error("  2. Check 'Block public access' settings");
                console.error("  3. Verify CORS configuration");
                console.error("  4. See S3_SETUP_GUIDE.md for details");
            } else if (errorMessage.includes("404")) {
                console.error("[DocumentScanner] Resource not found. Verify:");
                console.error("  1. Files are uploaded to the correct path");
                console.error("  2. Resource path is correct in widget settings");
                console.error("  3. File names match exactly (case-sensitive)");
            } else if (errorMessage.includes("Unexpected token")) {
                console.error("[DocumentScanner] Received HTML instead of JavaScript:");
                console.error("  1. Server is returning an error page (403/404/500)");
                console.error("  2. Check Network tab in browser DevTools");
                console.error("  3. Verify resource URL returns JavaScript, not HTML");
            }
        }
    }, [license, handleScanResult, uiPath?.value, engineRootPath?.value]);

    // Auto-launch on mount
    useEffect(() => {
        startScanning();

        // Cleanup on unmount
        return () => {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.dispose();
                scannerInstanceRef.current = null;
            }
        };
    }, [startScanning]);

    return (
        <div
            className={`document-scanner-wrapper ${className}`}
            style={{
                width: "100%",
                paddingTop: `${heightPercentage}%`,
                position: "relative",
                ...style
            }}
        >
            <div
                ref={containerRef}
                className="document-scanner-container"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%"
                }}
            />
        </div>
    );
}
