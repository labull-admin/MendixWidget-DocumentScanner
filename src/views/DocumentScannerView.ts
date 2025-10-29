import {
    EnumCapturedResultItemType,
    EnumImagePixelFormat,
    OriginalImageResultItem,
    Quadrilateral,
    CapturedResultReceiver,
    CapturedResult,
    DetectedQuadResultItem,
    DeskewedImageResultItem,
    MultiFrameResultCrossFilter
} from "dynamsoft-capture-vision-bundle";
import { SharedResources } from "../sdk/DocumentScanner";
import {
    DEFAULT_TEMPLATE_NAMES,
    DocumentResult,
    EnumFlowType,
    EnumResultStatus,
    UtilizedTemplateNames
} from "./utils/types";
import { DEFAULT_LOADING_SCREEN_STYLE, showLoadingScreen } from "./utils/LoadingScreen";
import { createStyle, findClosestResolutionLevel, getElement, isEmptyObject } from "./utils";

const DEFAULT_MIN_VERIFIED_FRAMES_FOR_CAPTURE = 2;
const ACTIVE_COLOR = "#1677ff"; // Custom theme color

const I18N_ZH = {
    initializingCamera: "正在初始化相机…",
    processingImage: "正在处理图片…",
    detectBorders: "边框检测",
    smartCapture: "智能拍摄",
    autoCrop: "自动裁剪",
    takePhoto: "拍照",
    close: "关闭",
    selectCameraOrResolution: "选择摄像头或分辨率",
    uploadImage: "上传图片",
    pleaseSelectImageFile: "请选择图片文件"
};

/**
 * Sets the scan region within the {@link DocumentScannerView} viewfinder for document scanning from the {@link @DocumentScannerViewConfig}.
 *
 * @remarks
 * MDS determines the scan region with the following steps:
 * 1. Use {@link ScanRegion.ratio} to set the height-to-width of the rectangular scanning region, then scale the rectangle up to fit within the viewfinder.
 * 2. Translate the rectangular up by the number of pixels specified by {@link ScanRegion.regionBottomMargin}.
 * 3. Create a visual border for the scanning region boundary on the viewfinder with a given stroke width in pixels, and a stroke color.
 *
 * @example
 * Create a scan region with a height-to-width ratio of 3:2, translated upwards by 20 pixels, with a green, 3 pixel-wide border in the viewfinder:
 *
 * ```javascript
 * scanRegion {
 *   ratio: {
 *     width: 2,
 *     height: 3,
 *   },
 *   regionBottomMargin: 20,
 *   style: {
 *     strokeWidth: 3,
 *     strokeColor: "green",
 *   },
 * }
 * ```
 *
 * @public
 */
export interface ScanRegion {
    /**
     * The aspect ratio of the rectangular scan region.
     *
     * @public
     */
    ratio: {
        /**
         * The width of the rectangular scan region.
         */
        width: number;
        /**
         * The height of the rectangular scan region.
         *
         * @public
         */
        height: number;
    };
    /**
     * Bottom margin below the scan region measured in pixels.
     *
     * @public
     */
    regionBottomMargin: number;
    /**
     * The styling for the scan region outline in the viewfinder.
     *
     * @public
     */
    style: {
        /**
         * The pixel width of the outline of the scan region.
         *
         * @public
         */
        strokeWidth: number;
        /**
         * The color of the outline of the scan region.
         *
         * @public
         */
        strokeColor: string;
    };
}

/**
 * The `DocumentScannerViewConfig` interface passes settings to the {@link DocumentScanner} constructor through the {@link DocumentScannerConfig} to apply UI and business logic customizations for the {@link DocumentScannerView}.
 * 
 * @remarks
 * Only rare and edge-case scenarios require editing the UI template or MDS source code. MDS uses sane default values for all omitted properties.
 * 
 * @example
 * ```javascript
 * const documentScanner = new Dynamsoft.DocumentScanner({
 *     license: "YOUR_LICENSE_KEY_HERE", // Replace with your actual license key
 *     scannerViewConfig: {
 *         cameraEnhancerUIPath: "../dist/document-scanner.ui.html", // Use the local file
 *     },
 * });
 ```
 
 @public
 */
export interface DocumentScannerViewConfig {
    /**
     * @privateRemarks
     * Removes Smart Capture if the {@link DocumentCorrectionView} is not available.
     *
     * @internal
     */
    _showCorrectionView?: boolean;
    /**
     * Path to a Capture Vision template for scanning configuration.
     *
     * @public
     */
    templateFilePath?: string;
    /**
     * Path to the UI definition file (`.html`) for the {@link DocumentScannerView}.
     *
     * @remarks
     * This typically does not need to be set as MDS provides a default template for general use. You may set custom paths to self-host or customize the template, or fully self-host MDS.
     * @see {@link https://www.dynamsoft.com/mobile-document-scanner/docs/web/guide/index.html#self-host-resources | self-hosting resources}
     *
     * @defaultValue {@link DEFAULT_DCE_UI_PATH}
     *
     * @public
     */
    cameraEnhancerUIPath?: string;
    /**
     * The HTML container element or selector for the {@link DocumentScannerView} UI.
     *
     * @public
     */
    container?: HTMLElement | string;
    // consecutiveResultFramesBeforeNormalization?: number;
    /**
     * Capture Vision template names for detection and correction.
     *
     * @defaultValue {@link DEFAULT_TEMPLATE_NAMES}
     *
     * @remarks
     * This typically does not need to be set as MDS provides a default template for general use. You may set custom names to self-host resources, or fully self-host MDS.
     * @see {@link https://www.dynamsoft.com/mobile-document-scanner/docs/web/guide/index.html#self-host-resources | self-hosting resources}
     * @see {@link https://www.dynamsoft.com/capture-vision/docs/core/parameters/file/capture-vision-template.html?lang=javascript | DCV Templates}
     *
     * @public
     */
    utilizedTemplateNames?: UtilizedTemplateNames;
    /**
     * Sets the Auto-Crop mode effective upon entering the {@link DocumentScannerView} UI.
     *
     * @defaultValue False
     *
     * @public
     */
    enableAutoCropMode?: boolean;
    /**
     * Sets the Smart Capture mode effective upon entering the {@link DocumentScannerView} UI.
     *
     * @defaultValue False
     *
     * @public
     */
    enableSmartCaptureMode?: boolean;
    /**
     * Defines the region within the viewport to detect documents.
     *
     * @see {@link ScanRegion}
     *
     * @public
     */
    scanRegion?: ScanRegion;
    /**
     * Sets minimum number of camera frames to detect document boundaries on Smart Capture mode.
     *
     * @remarks
     * Takes integer values between 1 and 5, inclusive.
     *
     * @defaultValue 2
     *
     * @public
     */
    minVerifiedFramesForAutoCapture?: number;
    /**
     * Sets the visibility of the mode selector menu.
     *
     * @defaultValue True
     *
     * @public
     */
    showSubfooter?: boolean;
    /**
     * Sets the visibility of the Dynamsoft branding message.
     *
     * @defaultValue True
     *
     * @public
     */
    showPoweredByDynamsoft?: boolean;
}

interface DCEElements {
    selectCameraBtn: HTMLElement | null;
    uploadImageBtn: HTMLElement | null;
    closeScannerBtn: HTMLElement | null;
    takePhotoBtn: HTMLElement | null;
    boundsDetectionBtn: HTMLElement | null;
    smartCaptureBtn: HTMLElement | null;
    autoCropBtn: HTMLElement | null;
}

// Implementation
export default class DocumentScannerView {
    // Capture Mode
    private boundsDetectionEnabled = true;
    private smartCaptureEnabled = false;
    private autoCropEnabled = false;

    private resizeTimer: number | null = null;

    // Used for Smart Capture Mode - use crossVerificationStatus
    private crossVerificationCount = 0;

    // Used for ImageEditorView (In NornalizerView)
    private capturedResultItems: CapturedResult["items"] = [];
    private originalImageData: OriginalImageResultItem["imageData"] | null = null;

    private initialized = false;
    private initializedDCE = false;

    // Elements
    private DCE_ELEMENTS: DCEElements = {
        selectCameraBtn: null,
        uploadImageBtn: null,
        closeScannerBtn: null,
        takePhotoBtn: null,
        boundsDetectionBtn: null,
        smartCaptureBtn: null,
        autoCropBtn: null
    };

    // Scan Resolve
    private currentScanResolver?: (result: DocumentResult) => void;

    private loadingScreen: ReturnType<typeof showLoadingScreen> | null = null;

    private showScannerLoadingOverlay(message?: string) {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        this.loadingScreen = showLoadingScreen(configContainer, { message });
        configContainer.style.display = "block";
        configContainer.style.position = "relative";
    }

    private hideScannerLoadingOverlay(hideContainer = false) {
        if (this.loadingScreen) {
            this.loadingScreen.hide();
            this.loadingScreen = null;

            if (hideContainer && this.config.container) {
                getElement(this.config.container).style.display = "none";
            }
        }
    }

    private getMinVerifiedFramesForAutoCapture() {
        // 1 <= minVerifiedFramesForAutoCapture <= 5
        if (
            !this.config?.minVerifiedFramesForAutoCapture ||
            this.config?.minVerifiedFramesForAutoCapture <= 0 ||
            this.config?.minVerifiedFramesForAutoCapture > 5
        ) {
            return DEFAULT_MIN_VERIFIED_FRAMES_FOR_CAPTURE;
        }

        return this.config?.minVerifiedFramesForAutoCapture;
    }

    constructor(private resources: SharedResources, private config: DocumentScannerViewConfig) {
        this.config.utilizedTemplateNames = {
            detect: config.utilizedTemplateNames?.detect || DEFAULT_TEMPLATE_NAMES.detect,
            normalize: config.utilizedTemplateNames?.normalize || DEFAULT_TEMPLATE_NAMES.normalize
        };
        // this.config.consecutiveResultFramesBeforeNormalization = config.consecutiveResultFramesBeforeNormalization || 15;
    }

    async initialize(): Promise<void> {
        // Set default value for autoCrop, smartCapture and boundsDetection modes
        this.autoCropEnabled = this.config?.enableAutoCropMode ?? false;
        this.smartCaptureEnabled = (this.config?.enableSmartCaptureMode || this.config?.enableAutoCropMode) ?? false; // If autoCrop is enabled, smartCapture should be too

        this.config.minVerifiedFramesForAutoCapture = this.getMinVerifiedFramesForAutoCapture();

        if (this.initialized) {
            return;
        }

        // Create loading screen style
        createStyle("dds-loading-screen-style", DEFAULT_LOADING_SCREEN_STYLE);

        try {
            const { cameraView, cameraEnhancer, cvRouter } = this.resources;

            if (!cameraView || !cameraEnhancer || !cvRouter) {
                throw new Error("Required resources not initialized");
            }

            // Set up cameraView styling
            // cameraView.getVideoElement().style.objectPosition = "center";
            cameraView.setScanRegionMaskStyle({
                ...cameraView.getScanRegionMaskStyle(),
                lineWidth: this.config?.scanRegion?.style?.strokeWidth ?? 2,
                strokeStyle: this.config?.scanRegion?.style?.strokeColor ?? "transparent"
            });
            cameraView.setVideoFit("cover");

            // Set cameraEnhancer as input for CaptureVisionRouter
            cvRouter.setInput(cameraEnhancer);

            // Add filter for smart capture
            const filter = new MultiFrameResultCrossFilter();
            filter.enableResultCrossVerification(EnumCapturedResultItemType.CRIT_DETECTED_QUAD, true);
            filter.enableResultDeduplication(EnumCapturedResultItemType.CRIT_DETECTED_QUAD, true);
            await cvRouter.addResultFilter(filter);

            // Initialize the template parameters for DL scanning4
            if (this.config.templateFilePath) {
                await cvRouter.initSettings(this.config.templateFilePath);
            }

            if (!this.config.utilizedTemplateNames?.detect) {
                throw new Error("Template names not configured");
            }

            const newSettings = await cvRouter.getSimplifiedSettings(this.config.utilizedTemplateNames.detect);
            newSettings.outputOriginalImage = true;
            (newSettings as any).documentSettings.scaleDownThreshold = 1000;
            await cvRouter.updateSettings(this.config.utilizedTemplateNames.detect, newSettings);

            cvRouter.maxImageSideLength = Infinity;

            const resultReceiver = new CapturedResultReceiver();
            resultReceiver.onCapturedResultReceived = result => this.handleBoundsDetection(result);
            await cvRouter.addResultReceiver(resultReceiver);

            this.initialized = true;
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            alert(errMsg);
            this.closeCamera();
            const result = {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: "DDS Init error"
                }
            };
            this.currentScanResolver?.(result);
        }
    }

    private async initializeElements() {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);

        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            throw new Error("Shadow root not found");
        }

        this.DCE_ELEMENTS = {
            selectCameraBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-select-camera-icon"),
            uploadImageBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-upload-image-icon"),
            closeScannerBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-close"),
            takePhotoBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-take-photo"),
            boundsDetectionBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-bounds-detection"),
            smartCaptureBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-smart-capture"),
            autoCropBtn: DCEContainer.shadowRoot.querySelector(".dce-mn-auto-crop")
        };

        this.assignDCEClickEvents();

        // Localize labels/titles to Chinese
        try {
            (DCEContainer.shadowRoot.querySelector(".dce-mn-bounds-detection-text") as HTMLElement).innerText =
                I18N_ZH.detectBorders;
            (DCEContainer.shadowRoot.querySelector(".dce-mn-smart-capture-text") as HTMLElement).innerText =
                I18N_ZH.smartCapture;
            (DCEContainer.shadowRoot.querySelector(".dce-mn-auto-crop-text") as HTMLElement).innerText =
                I18N_ZH.autoCrop;

            (this.DCE_ELEMENTS.boundsDetectionBtn as HTMLElement).title = I18N_ZH.detectBorders;
            (this.DCE_ELEMENTS.smartCaptureBtn as HTMLElement).title = I18N_ZH.smartCapture;
            (this.DCE_ELEMENTS.autoCropBtn as HTMLElement).title = I18N_ZH.autoCrop;
            (this.DCE_ELEMENTS.takePhotoBtn as HTMLElement).title = I18N_ZH.takePhoto;
            (this.DCE_ELEMENTS.closeScannerBtn as HTMLElement).title = I18N_ZH.close;
            (this.DCE_ELEMENTS.selectCameraBtn as HTMLElement).title = I18N_ZH.selectCameraOrResolution;
            (this.DCE_ELEMENTS.uploadImageBtn as HTMLElement).title = I18N_ZH.uploadImage;
        } catch {}

        // If showCorrectionView is false, hide smartCapture
        if (this.config._showCorrectionView === false) {
            this.DCE_ELEMENTS.smartCaptureBtn?.style && (this.DCE_ELEMENTS.smartCaptureBtn.style.display = "none");
        }

        // Make header bar transparent and keep only torch and close buttons visible
        const header = DCEContainer.shadowRoot.querySelector(".dce-header") as HTMLElement;
        if (header) {
            // Make header transparent to hide the bar background
            header.style.background = "transparent";
            header.style.border = "none";

            // Hide the select camera dropdown
            const selectCameraBtn = header.querySelector(".dce-mn-select-camera-icon") as HTMLElement;
            if (selectCameraBtn) {
                selectCameraBtn.style.display = "none";
            }

            // Hide the resolution box
            const resolutionBox = header.querySelector(".dce-mn-resolution-box") as HTMLElement;
            if (resolutionBox) {
                resolutionBox.style.display = "none";
            }

            // Hide the upload button
            const uploadBtn = header.querySelector(".dce-mn-upload-image-icon") as HTMLElement;
            if (uploadBtn) {
                uploadBtn.style.display = "none";
            }

            // Hide the close button
            const closeBtn = header.querySelector(".dce-mn-close") as HTMLElement;
            if (closeBtn) {
                closeBtn.style.display = "none";
            }

            // Make torch button 2 times bigger
            const torchBtn = header.querySelector(".dce-torch-btn") as HTMLElement;
            if (torchBtn) {
                torchBtn.style.transform = "scale(2)";
                torchBtn.style.transformOrigin = "top right";
            }
        }

        // Hide the three mode buttons but keep them functional
        const subFooter = DCEContainer.shadowRoot.querySelector(".dce-subfooter") as HTMLElement;
        if (subFooter) {
            subFooter.style.display = "none";
        }

        // Change layout structure: Make camera view and footer display as flexbox with gap
        const macroContainer = DCEContainer.shadowRoot.querySelector(
            ".dce-macro-use-mobile-native-like-ui"
        ) as HTMLElement;
        if (macroContainer) {
            macroContainer.style.display = "flex";
            macroContainer.style.flexDirection = "column";
            macroContainer.style.height = "100%";
            macroContainer.style.overflow = "hidden";
            macroContainer.style.background = "transparent";
            macroContainer.style.position = "relative";
        }

        // Make the camera view container take available space but leave room for footer
        const cameraContainer = DCEContainer.shadowRoot.querySelector(".dce-camera-related-container") as HTMLElement;
        if (cameraContainer) {
            cameraContainer.style.flex = "1 1 auto";
            cameraContainer.style.minHeight = "0";
            cameraContainer.style.height = "100%";
            cameraContainer.style.overflow = "hidden";
            cameraContainer.style.background = "transparent";
            cameraContainer.style.position = "relative";
        }

        // Find and style the actual video stream container to fill properly
        const videoStreamContainer = DCEContainer.shadowRoot.querySelector(
            ".dce-video-stream-container"
        ) as HTMLElement;
        if (videoStreamContainer) {
            videoStreamContainer.style.height = "100%";
            videoStreamContainer.style.width = "100%";
            videoStreamContainer.style.position = "relative";
            videoStreamContainer.style.overflow = "hidden";
            videoStreamContainer.style.background = "transparent";
        }

        // Find and style the video element itself
        const videoElement = DCEContainer.shadowRoot.querySelector(".dce-video") as HTMLElement;
        if (videoElement) {
            videoElement.style.width = "100%";
            videoElement.style.height = "100%";
            videoElement.style.objectFit = "cover";
            videoElement.style.position = "absolute";
            videoElement.style.top = "0";
            videoElement.style.left = "0";
        }

        // Ensure the DCE container fills the available space
        const DCEContainerElement = DCEContainer as HTMLElement;
        if (DCEContainerElement) {
            DCEContainerElement.style.width = "100%";
            DCEContainerElement.style.height = "100%";
            DCEContainerElement.style.position = "absolute";
            DCEContainerElement.style.background = "transparent";
        }

        // Adjust footer to display below camera view (not absolute positioned)
        const footer = DCEContainer.shadowRoot.querySelector(".dce-footer") as HTMLElement;
        if (footer) {
            footer.style.position = "absolute";
            footer.style.bottom = "0";
            footer.style.left = "0";
            footer.style.right = "0";
            footer.style.width = "100%";
            footer.style.height = "auto";
            footer.style.backgroundColor = "transparent";
            footer.style.justifyContent = "center";
            footer.style.alignItems = "center";
            footer.style.display = "flex";
            footer.style.flexShrink = "0";
            footer.style.padding = "1rem";
            footer.style.zIndex = "10";
        }

        // Hide the loading circle animation completely
        const loadingAnimation = DCEContainer.shadowRoot.querySelector(
            ".dce-loading-auto-capture-animation"
        ) as HTMLElement;
        if (loadingAnimation) {
            loadingAnimation.style.display = "none";
        }

        // Add styles for transparent backgrounds and button styling
        const style = document.createElement("style");
        style.textContent = `
      :host {
        background: transparent !important;
      }
      .dce-macro-use-mobile-native-like-ui {
        background: transparent !important;
        position: relative !important;
      }
      .dce-camera-related-container {
        background: transparent !important;
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
      }
      .dce-video-stream-container {
        background: transparent !important;
        flex: 1 1 auto !important;
        min-height: 0 !important;
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        overflow: hidden !important;
      }
      .dce-camera-related-container video,
      .dce-camera-related-container canvas,
      .dce-video,
      .dce-video-stream-container video,
      .dce-video-stream-container canvas {
        background: transparent !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
      }
      .dce-mn-take-photo {
        width: 80px !important;
        height: 80px !important;
        background: #1677ff !important;
        border-radius: 50% !important;
        box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3) !important;
        border: 4px solid white !important;
        transition: all 0.2s ease !important;
        pointer-events: auto !important;
      }
      .dce-mn-take-photo:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 16px rgba(22, 119, 255, 0.4) !important;
      }
      .dce-mn-take-photo svg {
        width: 40px !important;
        height: 40px !important;
      }
      .dce-mn-take-photo svg circle {
        fill: #1677ff !important;
        stroke: white !important;
        stroke-width: 2 !important;
      }
      .dce-mn-take-photo svg path {
        fill: white !important;
      }
      .dce-footer {
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        z-index: 10 !important;
        background: transparent !important;
        pointer-events: none !important;
      }
    `;
        DCEContainer.shadowRoot.appendChild(style);

        // Hide "Powered by Dynamsoft" text
        const poweredByDynamsoft = DCEContainer.shadowRoot.querySelector(".dce-mn-msg-poweredby") as HTMLElement;
        if (poweredByDynamsoft) {
            poweredByDynamsoft.style.display = "none";
        }

        // Hide subfooter or showPoweredByDynamsoft message (keep for config support)
        if (this.config?.showSubfooter === false) {
            if (subFooter) {
                subFooter.style.display = "none";
            }
        }
        if (this.config?.showPoweredByDynamsoft === false) {
            if (poweredByDynamsoft) {
                poweredByDynamsoft.style.display = "none";
            }
        }

        this.initializedDCE = true;
    }

    private assignDCEClickEvents() {
        if (!Object.values(this.DCE_ELEMENTS).every(Boolean)) {
            throw new Error("Camera control elements not found");
        }

        this.takePhoto = this.takePhoto.bind(this);
        this.toggleBoundsDetection = this.toggleBoundsDetection.bind(this);
        this.toggleSmartCapture = this.toggleSmartCapture.bind(this);
        this.toggleAutoCrop = this.toggleAutoCrop.bind(this);
        this.closeCamera = this.closeCamera.bind(this);

        // Using onclick instead of addEventListener
        this.DCE_ELEMENTS.takePhotoBtn && (this.DCE_ELEMENTS.takePhotoBtn.onclick = this.takePhoto);

        this.DCE_ELEMENTS.boundsDetectionBtn &&
            (this.DCE_ELEMENTS.boundsDetectionBtn.onclick = async () => {
                await this.toggleBoundsDetection();
            });

        this.DCE_ELEMENTS.smartCaptureBtn &&
            (this.DCE_ELEMENTS.smartCaptureBtn.onclick = async () => {
                await this.toggleSmartCapture();
            });

        this.DCE_ELEMENTS.autoCropBtn &&
            (this.DCE_ELEMENTS.autoCropBtn.onclick = async () => {
                await this.toggleAutoCrop();
            });

        this.DCE_ELEMENTS.closeScannerBtn &&
            (this.DCE_ELEMENTS.closeScannerBtn.onclick = async () => {
                await this.handleCloseBtn();
            });

        this.DCE_ELEMENTS.selectCameraBtn &&
            (this.DCE_ELEMENTS.selectCameraBtn.onclick = event => {
                event.stopPropagation();
                this.toggleSelectCameraBox();
            });

        this.DCE_ELEMENTS.uploadImageBtn &&
            (this.DCE_ELEMENTS.uploadImageBtn.onclick = () => {
                this.uploadImage();
            });
    }

    async handleCloseBtn() {
        this.closeCamera();

        if (this.currentScanResolver) {
            this.currentScanResolver({
                status: {
                    code: EnumResultStatus.RS_CANCELLED,
                    message: "Cancelled"
                }
            });
        }
    }

    private attachOptionClickListeners() {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];
        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const settingsContainer = DCEContainer.shadowRoot.querySelector(
            ".dce-mn-camera-and-resolution-settings"
        ) as HTMLElement;

        const cameraOptions = DCEContainer.shadowRoot.querySelectorAll(".dce-mn-camera-option");
        const resolutionOptions = DCEContainer.shadowRoot.querySelectorAll(".dce-mn-resolution-option");

        // Add click handlers to all options
        [...Array.from(cameraOptions), ...Array.from(resolutionOptions)].forEach(option => {
            (option as HTMLElement).onclick = () => {
                const deviceId = option.getAttribute("data-davice-id");
                const resHeight = option.getAttribute("data-height");
                const resWidth = option.getAttribute("data-width");
                if (deviceId && this.resources.cameraEnhancer) {
                    this.resources.cameraEnhancer.selectCamera(deviceId).then(() => {
                        this.toggleScanGuide(true);
                    });
                } else if (resHeight && resWidth && this.resources.cameraEnhancer) {
                    this.resources.cameraEnhancer
                        .setResolution({
                            width: parseInt(resWidth),
                            height: parseInt(resHeight)
                        })
                        .then(() => {
                            this.toggleScanGuide(true);
                        });
                }

                if (settingsContainer.style.display !== "none") {
                    this.toggleSelectCameraBox();
                }
            };
        });
    }

    private highlightCameraAndResolutionOption() {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];
        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const settingsContainer = DCEContainer.shadowRoot.querySelector(
            ".dce-mn-camera-and-resolution-settings"
        ) as HTMLElement;
        const cameraOptions = settingsContainer.querySelectorAll(".dce-mn-camera-option");
        const resOptions = settingsContainer.querySelectorAll(".dce-mn-resolution-option");

        const selectedCamera = this.resources.cameraEnhancer?.getSelectedCamera();
        const selectedResolution = this.resources.cameraEnhancer?.getResolution();

        cameraOptions.forEach(options => {
            const o = options as HTMLElement;
            if (o.getAttribute("data-davice-id") === selectedCamera?.deviceId) {
                o.style.border = `2px solid ${ACTIVE_COLOR}`;
            } else {
                o.style.border = "none";
            }
        });

        const heightMap: Record<string, string> = {
            "480p": "480",
            "720p": "720",
            "1080p": "1080",
            "2k": "1440",
            "4k": "2160"
        };
        const resolutionLvl = selectedResolution ? findClosestResolutionLevel(selectedResolution) : "1080p";

        resOptions.forEach(options => {
            const o = options as HTMLElement;
            const height = o.getAttribute("data-height");

            if (height === heightMap[resolutionLvl]) {
                o.style.border = `2px solid ${ACTIVE_COLOR}`;
            } else {
                o.style.border = "none";
            }
        });
    }

    private toggleSelectCameraBox() {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const settingsBox = DCEContainer.shadowRoot.querySelector(".dce-mn-resolution-box") as HTMLElement;

        // Highlight current camera and resolution
        this.highlightCameraAndResolutionOption();

        // Attach highlighting camera and resolution options on option click
        this.attachOptionClickListeners();

        settingsBox.click();

        this.toggleScanGuide(true);
    }

    private async uploadImage() {
        // Create hidden file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg";
        input.style.display = "none";
        document.body.appendChild(input);

        try {
            this.showScannerLoadingOverlay(I18N_ZH.processingImage);

            // Get file from input
            const file = await new Promise<File>((resolve, reject) => {
                input.onchange = (e: Event) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (!f?.type.startsWith("image/")) {
                        reject(new Error("Please select an image file"));
                        return;
                    }
                    resolve(f);
                };

                input.addEventListener("cancel", () => this.hideScannerLoadingOverlay(false));
                input.click();
            });

            if (!file) {
                this.hideScannerLoadingOverlay(false);
                return;
            }

            this.closeCamera(false);

            // Convert file to blob
            const { blob } = await this.fileToBlob(file);

            if (!this.resources.cvRouter || !this.config.utilizedTemplateNames?.detect) {
                throw new Error("CV Router or template names not initialized");
            }

            this.capturedResultItems = (
                await this.resources.cvRouter.capture(blob, this.config.utilizedTemplateNames.detect)
            ).items;
            this.originalImageData = (this.capturedResultItems[0] as OriginalImageResultItem)?.imageData;

            // Reset captured items if not using bounds detection
            let detectedQuadrilateral: Quadrilateral | null = null;
            const useImageDimensions = this.capturedResultItems?.length <= 1;
            if (useImageDimensions) {
                this.capturedResultItems = [];
                const { width, height } = this.originalImageData;
                detectedQuadrilateral = {
                    points: [
                        { x: 0, y: 0 },
                        { x: width, y: 0 },
                        { x: width, y: height },
                        { x: 0, y: height }
                    ],
                    area: height * width
                } as Quadrilateral;
            } else {
                detectedQuadrilateral = (
                    this.capturedResultItems.find(
                        item => item.type === EnumCapturedResultItemType.CRIT_DETECTED_QUAD
                    ) as DetectedQuadResultItem
                )?.location;
            }

            if (!detectedQuadrilateral) {
                throw new Error("Detected quadrilateral is missing");
            }

            const correctedImageResult = await this.normalizeImage(
                detectedQuadrilateral.points,
                this.originalImageData
            );

            const result = {
                status: {
                    code: EnumResultStatus.RS_SUCCESS,
                    message: "Success"
                },
                originalImageResult: this.originalImageData,
                correctedImageResult,
                detectedQuadrilateral,
                _flowType: EnumFlowType.UPLOADED_IMAGE
            };

            // Update shared resources
            this.resources.onResultUpdated?.(result);

            // Resolve scan promise
            this.currentScanResolver?.(result);

            // Done processing
            this.hideScannerLoadingOverlay(true);
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            alert(errMsg);
            this.closeCamera();

            const result = {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: "Error processing uploaded image"
                }
            };
            this.currentScanResolver?.(result);
        } finally {
            document.body.removeChild(input);
        }
    }

    private async fileToBlob(file: File): Promise<{ blob: Blob; width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve({ blob, width: img.width, height: img.height });
                    } else {
                        reject(new Error("Failed to create blob"));
                    }
                }, file.type);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async toggleAutoCaptureAnimation(enabled?: boolean) {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const loadingAnimation = DCEContainer.shadowRoot.querySelector(
            ".dce-loading-auto-capture-animation"
        ) as HTMLElement;

        loadingAnimation.style.borderLeftColor = enabled ? "transparent" : ACTIVE_COLOR;
        loadingAnimation.style.borderBottomColor = enabled ? "transparent" : ACTIVE_COLOR;
    }

    async toggleBoundsDetection(enabled?: boolean) {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const container = DCEContainer.shadowRoot.querySelector(".dce-mn-bounds-detection") as HTMLElement;
        const onIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-bounds-detection-on") as HTMLElement;
        const offIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-bounds-detection-off") as HTMLElement;

        if (!onIcon || !offIcon) {
            return;
        }

        this.toggleAutoCaptureAnimation(false);
        const newBoundsDetectionState = enabled !== undefined ? enabled : !this.boundsDetectionEnabled;

        // If we're turning off bounds detection, ensure smart capture is turned off
        if (!newBoundsDetectionState) {
            await this.toggleSmartCapture(false);
        }

        const { cvRouter } = this.resources;

        if (!cvRouter || !this.config.utilizedTemplateNames?.detect) {
            return;
        }

        this.boundsDetectionEnabled = newBoundsDetectionState;
        container.style.color = this.boundsDetectionEnabled ? ACTIVE_COLOR : "#fff";
        offIcon.style.display = this.boundsDetectionEnabled ? "none" : "block";
        onIcon.style.display = this.boundsDetectionEnabled ? "block" : "none";

        if (this.initialized && this.boundsDetectionEnabled) {
            await cvRouter.startCapturing(this.config.utilizedTemplateNames.detect);

            this.toggleScanGuide(true);
        } else if (this.initialized && !this.boundsDetectionEnabled) {
            this.stopCapturing();
        }
    }

    async toggleSmartCapture(mode?: boolean) {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const container = DCEContainer.shadowRoot.querySelector(".dce-mn-smart-capture") as HTMLElement;
        const onIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-smart-capture-on") as HTMLElement;
        const offIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-smart-capture-off") as HTMLElement;

        if (!onIcon || !offIcon) {
            return;
        }

        const newSmartCaptureState = mode !== undefined ? mode : !this.smartCaptureEnabled;
        this.toggleAutoCaptureAnimation(newSmartCaptureState);

        // If trying to turn on auto capture, ensure bounds detection is on
        // If turning off auto capture, ensure auto crop is off
        if (newSmartCaptureState && !this.boundsDetectionEnabled) {
            await this.toggleBoundsDetection(true);
        } else if (!newSmartCaptureState && this.config._showCorrectionView !== false) {
            // Handle correctionView
            await this.toggleAutoCrop(false);
        }

        this.smartCaptureEnabled = newSmartCaptureState;
        container.style.color = this.smartCaptureEnabled ? ACTIVE_COLOR : "#fff";
        offIcon.style.display = this.smartCaptureEnabled ? "none" : "block";
        onIcon.style.display = this.smartCaptureEnabled ? "block" : "none";

        // Reset crossVerificationCount whenever we toggle the smart capture
        this.crossVerificationCount = 0;
    }

    async toggleAutoCrop(mode?: boolean) {
        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        const DCEContainer = configContainer.children[configContainer.children.length - 1];

        if (!DCEContainer?.shadowRoot) {
            return;
        }

        const container = DCEContainer.shadowRoot.querySelector(".dce-mn-auto-crop") as HTMLElement;
        const onIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-auto-crop-on") as HTMLElement;
        const offIcon = DCEContainer.shadowRoot.querySelector(".dce-mn-auto-crop-off") as HTMLElement;

        if (!onIcon || !offIcon) {
            return;
        }

        const newSmartCaptureState = mode !== undefined ? mode : !this.autoCropEnabled;

        // If trying to turn on auto capture, ensure bounds detection is on
        if (newSmartCaptureState && (!this.boundsDetectionEnabled || !this.smartCaptureEnabled)) {
            // Turn on bouds detection first
            await this.toggleBoundsDetection(true);
            await this.toggleSmartCapture(true);
        }

        // If turning off auto crop and _showCorrectionView is false, also turn off smartCapture
        if (!newSmartCaptureState && this.config._showCorrectionView === false) {
            await this.toggleSmartCapture(false);
        }

        this.autoCropEnabled = newSmartCaptureState;
        container.style.color = this.autoCropEnabled ? ACTIVE_COLOR : "#fff";
        offIcon.style.display = this.autoCropEnabled ? "none" : "block";
        onIcon.style.display = this.autoCropEnabled ? "block" : "none";
    }

    private handleResize = () => {
        // Hide all guides first
        this.toggleScanGuide(false);

        // Clear existing timer
        if (this.resizeTimer) {
            window.clearTimeout(this.resizeTimer);
        }

        // Set new timer
        this.resizeTimer = window.setTimeout(() => {
            // Re-show guides and update scan region
            this.toggleScanGuide(true);
        }, 500);
    };

    private toggleScanGuide(enabled?: boolean) {
        if (enabled && !isEmptyObject(this.config?.scanRegion?.ratio)) {
            this.calculateScanRegion();
        }
    }

    private calculateScanRegion() {
        const { cameraEnhancer, cameraView } = this.resources;

        if (!cameraEnhancer || !cameraView || !cameraEnhancer.isOpen()) {
            return;
        }

        // Get visible region of video
        const visibleRegion = cameraView.getVisibleRegionOfVideo({ inPixels: true });

        if (!visibleRegion) {
            return;
        }

        // Get the total video dimensions
        const video = cameraView.getVideoElement();
        const totalWidth = video.videoWidth;
        const totalHeight = video.videoHeight;

        // Get the document ratio for the specific document type

        const targetRatio = this.config?.scanRegion?.ratio;
        if (!targetRatio) {
            return;
        }

        // Calculate the base unit to scale the document dimensions
        let baseUnit: number;

        // Calculate bottom margin
        const bottomMarginPx = this.config?.scanRegion?.regionBottomMargin ?? 0; // 5 * 16 is 5rem in pixels
        const effectiveHeightWithMargin = visibleRegion.height - bottomMarginPx;

        if (visibleRegion.width > visibleRegion.height) {
            // Landscape orientation
            const availableHeight = effectiveHeightWithMargin * 0.75;
            baseUnit = availableHeight / targetRatio.height;

            // Check if width would exceed bounds
            const resultingWidth = baseUnit * targetRatio.width;
            if (resultingWidth > visibleRegion.width * 0.9) {
                // If too wide, recalculate using width as reference
                baseUnit = (visibleRegion.width * 0.9) / targetRatio.width;
            }
        } else {
            // Portrait orientation
            const availableWidth = visibleRegion.width * 0.9;
            baseUnit = availableWidth / targetRatio.width;

            // Check if height would exceed bounds
            const resultingHeight = baseUnit * targetRatio.height;
            if (resultingHeight > effectiveHeightWithMargin * 0.75) {
                // If too tall, recalculate using height as reference
                baseUnit = (effectiveHeightWithMargin * 0.75) / targetRatio.height;
            }
        }

        // Calculate actual dimensions in pixels
        const actualWidth = baseUnit * targetRatio.width;
        const actualHeight = baseUnit * targetRatio.height;

        // Calculate the offsets to center the region horizontally and vertically
        const leftOffset = (visibleRegion.width - actualWidth) / 2;
        const topOffset = (effectiveHeightWithMargin - actualHeight) / 2;

        // Calculate pixel coordinates of the scan region relative to the visible region
        const scanLeft = leftOffset;
        const scanRight = leftOffset + actualWidth;
        const scanTop = topOffset;
        const scanBottom = topOffset + actualHeight;

        // Convert to percentages relative to the TOTAL video size, considering the visible region offset
        const absoluteLeft = visibleRegion.x + scanLeft;
        const absoluteRight = visibleRegion.x + scanRight;
        const absoluteTop = visibleRegion.y + scanTop;
        const absoluteBottom = visibleRegion.y + scanBottom;

        const left = (absoluteLeft / totalWidth) * 100;
        const right = (absoluteRight / totalWidth) * 100;
        const top = (absoluteTop / totalHeight) * 100;
        const bottom = (absoluteBottom / totalHeight) * 100;

        // Apply scan region
        const region = {
            left: Math.round(left),
            right: Math.round(right),
            top: Math.round(top),
            bottom: Math.round(bottom),
            isMeasuredInPercentage: true
        };

        cameraView?.setScanRegionMaskVisible(true);
        cameraEnhancer.setScanRegion(region);
    }

    async openCamera(): Promise<void> {
        try {
            this.showScannerLoadingOverlay(I18N_ZH.initializingCamera);

            const { cameraEnhancer, cameraView } = this.resources;

            if (!cameraEnhancer || !cameraView) {
                throw new Error("Camera resources not initialized");
            }

            if (!this.config.container) {
                return;
            }
            const configContainer = getElement(this.config.container);
            configContainer.style.display = "block";

            if (!cameraEnhancer.isOpen()) {
                const currentCameraView = cameraView.getUIElement();
                if (!currentCameraView.parentElement) {
                    configContainer.append(currentCameraView);
                }

                await cameraEnhancer.open();
            } else if (cameraEnhancer.isPaused()) {
                await cameraEnhancer.resume();
            }

            // Try to set default as 2k
            await cameraEnhancer.setResolution({
                width: 2560,
                height: 1440
            });

            // Assign boundsDetection, smartCapture, and takePhoto element
            if (!this.initializedDCE && cameraEnhancer.isOpen()) {
                await this.initializeElements();
            }

            // Add resize
            window.addEventListener("resize", this.handleResize);

            // Toggle capture modes
            await this.toggleBoundsDetection(this.boundsDetectionEnabled);
            await this.toggleSmartCapture(this.smartCaptureEnabled);
            await this.toggleAutoCrop(this.autoCropEnabled);
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            alert(errMsg);
            this.closeCamera();
            const result = {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: "DDS Open Camera Error"
                }
            };
            this.currentScanResolver?.(result);
        } finally {
            this.hideScannerLoadingOverlay();
        }
    }

    closeCamera(hideContainer = true) {
        // Remove resize event listener
        window.removeEventListener("resize", this.handleResize);
        // Clear any existing resize timer
        if (this.resizeTimer) {
            window.clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }

        const { cameraEnhancer, cameraView } = this.resources;

        if (!cameraEnhancer || !cameraView) {
            return;
        }

        if (!this.config.container) {
            return;
        }
        const configContainer = getElement(this.config.container);
        configContainer.style.display = hideContainer ? "none" : "block";

        if (cameraView.getUIElement().parentElement) {
            configContainer.removeChild(cameraView.getUIElement());
        }

        cameraEnhancer.close();
        this.stopCapturing();
    }

    pauseCamera() {
        const { cameraEnhancer } = this.resources;
        if (!cameraEnhancer) {
            return;
        }
        cameraEnhancer.pause();
    }

    stopCapturing() {
        const { cameraView, cvRouter } = this.resources;

        if (!cvRouter || !cameraView) {
            return;
        }
        cvRouter.stopCapturing();
        cameraView.clearAllInnerDrawingItems();
    }

    private getFlowType(): EnumFlowType {
        // Find flow type
        return this.autoCropEnabled
            ? EnumFlowType.AUTO_CROP
            : this.smartCaptureEnabled
            ? EnumFlowType.SMART_CAPTURE
            : EnumFlowType.MANUAL;
    }

    async takePhoto() {
        try {
            const { cameraEnhancer, onResultUpdated } = this.resources;

            // Set the original image based on bounds detection and captured results
            const shouldUseLatestFrame =
                !this.boundsDetectionEnabled || (this.boundsDetectionEnabled && this.capturedResultItems?.length <= 1); // Starts at one bc result always includes original image

            this.originalImageData = shouldUseLatestFrame
                ? cameraEnhancer?.fetchImage() ?? null
                : this.originalImageData;

            // Reset captured items if not using bounds detection
            let correctedImageResult = null;
            let detectedQuadrilateral: Quadrilateral | null = null;
            if (shouldUseLatestFrame) {
                this.capturedResultItems = [];
                if (!this.originalImageData) {
                    throw new Error("Original image data is missing");
                }
                const { width, height } = this.originalImageData;
                detectedQuadrilateral = {
                    points: [
                        { x: 0, y: 0 },
                        { x: width, y: 0 },
                        { x: width, y: height },
                        { x: 0, y: height }
                    ],
                    area: height * width
                } as Quadrilateral;
            } else {
                detectedQuadrilateral = (
                    this.capturedResultItems.find(
                        item => item.type === EnumCapturedResultItemType.CRIT_DETECTED_QUAD
                    ) as DetectedQuadResultItem
                )?.location;
            }

            // If theres no detected quads, we shouldnt convert to scanRegionCoordinates since we're using the full image.
            if (!isEmptyObject(this.config?.scanRegion?.ratio) && !shouldUseLatestFrame && detectedQuadrilateral) {
                // If scan region is enabled, convert to scanRegionCoordinates
                detectedQuadrilateral.points = detectedQuadrilateral.points.map(
                    point => this.resources.cameraEnhancer?.convertToScanRegionCoordinates(point) || point
                ) as Quadrilateral["points"];
            }

            const flowType = this.getFlowType();
            // turn off smart capture (and also auto crop) before closin camera
            await this.toggleSmartCapture(false);

            // Clean up camera and capture
            this.closeCamera();

            // Show loading screen
            this.showScannerLoadingOverlay(I18N_ZH.processingImage);

            // Retrieve corrected image result
            if (!detectedQuadrilateral) {
                throw new Error("Detected quadrilateral is missing");
            }
            if (!this.originalImageData) {
                throw new Error("Original image data is missing");
            }
            correctedImageResult = await this.normalizeImage(detectedQuadrilateral.points, this.originalImageData);

            // Hide loading screen
            this.hideScannerLoadingOverlay(true);

            const result: DocumentResult = {
                status: {
                    code: EnumResultStatus.RS_SUCCESS,
                    message: "Success"
                },
                originalImageResult: this.originalImageData,
                correctedImageResult,
                detectedQuadrilateral,
                _flowType: flowType
            };

            // Emit result through shared resources
            onResultUpdated?.(result);

            // Resolve scan promise
            this.currentScanResolver?.(result);
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            alert(errMsg);

            this.closeCamera();
            const result = {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: "Error capturing image"
                }
            };
            this.currentScanResolver?.(result);
        }
    }

    async handleBoundsDetection(result: CapturedResult) {
        this.capturedResultItems = result.items;

        if (!result.items?.length) {
            return;
        }

        const originalImage = result.items.filter(
            item => item.type === EnumCapturedResultItemType.CRIT_ORIGINAL_IMAGE
        ) as OriginalImageResultItem[];
        this.originalImageData = originalImage.length ? originalImage[0].imageData : null;

        if (this.smartCaptureEnabled || this.autoCropEnabled) {
            this.handleAutoCaptureMode(result);
        }
    }

    /**
     * Normalize an image with DDN given a set of points
     * @param points - points provided by either users or DDN's detect quad
     * @returns normalized image by DDN
     */
    private async handleAutoCaptureMode(result: CapturedResult) {
        /** If "Smart Capture" or "Auto Crop" is checked, the library uses the document boundaries found in consecutive
         * cross verified frames to decide whether conditions are suitable for automatic normalization.
         */
        if (result.items.length <= 1) {
            this.crossVerificationCount = 0;
            return;
        }

        if ((result.processedDocumentResult?.detectedQuadResultItems?.[0] as any)?.crossVerificationStatus === 1) {
            this.crossVerificationCount++;
        }

        /**
         * In our case, we determine a good condition for "automatic normalization" to be
         * "getting document boundary detected after 2 cross verified results".
         */
        if (
            this.crossVerificationCount >=
            (this.config?.minVerifiedFramesForAutoCapture ?? DEFAULT_MIN_VERIFIED_FRAMES_FOR_CAPTURE)
        ) {
            this.crossVerificationCount = 0;

            await this.takePhoto();
        }
    }

    async launch(): Promise<DocumentResult> {
        try {
            await this.initialize();

            const { cvRouter, cameraEnhancer } = this.resources;

            if (!cvRouter || !cameraEnhancer || !this.config.utilizedTemplateNames?.detect) {
                throw new Error("Camera resources or template names not initialized");
            }

            return new Promise(async resolve => {
                this.currentScanResolver = resolve;

                // Start capturing
                await this.openCamera();

                if (this.boundsDetectionEnabled && this.config.utilizedTemplateNames?.detect) {
                    await cvRouter.startCapturing(this.config.utilizedTemplateNames.detect);
                }

                this.toggleScanGuide(true);

                // By default, cameraEnhancer captures grayscale images to optimize performance.
                // To capture RGB Images, we set the Pixel Format to EnumImagePixelFormat.IPF_ABGR_8888
                cameraEnhancer.setPixelFormat(EnumImagePixelFormat.IPF_ABGR_8888);

                // Reset crossVerificationCount
                this.crossVerificationCount = 0;
            });
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error("DDS Launch error: ", errMsg);
            this.closeCamera();
            const result = {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: "DDS Launch error"
                }
            };
            this.currentScanResolver?.(result);
            return result;
        }
    }

    async normalizeImage(
        points: Quadrilateral["points"],
        originalImageData: OriginalImageResultItem["imageData"]
    ): Promise<DeskewedImageResultItem> {
        const { cvRouter, cameraEnhancer } = this.resources;

        if (!cvRouter || !cameraEnhancer || !this.config.utilizedTemplateNames?.normalize) {
            throw new Error("Resources not initialized");
        }

        const settings = await cvRouter.getSimplifiedSettings(this.config.utilizedTemplateNames.normalize);
        settings.roiMeasuredInPercentage = false;
        settings.roi.points = points;
        await cvRouter.updateSettings(this.config.utilizedTemplateNames.normalize, settings);

        const result = await cvRouter.capture(originalImageData, this.config.utilizedTemplateNames.normalize);
        // If deskewed result found
        if (result?.processedDocumentResult?.deskewedImageResultItems?.[0]) {
            return result.processedDocumentResult.deskewedImageResultItems[0];
        }
        throw new Error("Failed to generate normalized image");
    }
}
