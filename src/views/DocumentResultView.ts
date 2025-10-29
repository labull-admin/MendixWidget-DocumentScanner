import { SharedResources } from "../sdk/DocumentScanner";
import DocumentScannerView from "./DocumentScannerView";
import { DeskewedImageResultItem } from "dynamsoft-capture-vision-bundle";
import { createControls, createStyle, getElement, shouldCorrectImage } from "./utils";
import DocumentCorrectionView from "./DocumentCorrectionView";
import { DDS_ICONS } from "./utils/icons";
import { DocumentResult, EnumFlowType, EnumResultStatus, ToolbarButton, ToolbarButtonConfig } from "./utils/types";

const I18N_ZH = {
    retake: "重新拍摄",
    correction: "校正",
    done: "完成"
};

export interface DocumentResultViewToolbarButtonsConfig {
    retake?: ToolbarButtonConfig;
    correct?: ToolbarButtonConfig;
    share?: ToolbarButtonConfig;
    upload?: ToolbarButtonConfig;
    done?: ToolbarButtonConfig;
}

/**
 * The `DocumentResultViewConfig` interface passes settings to the {@link DocumentScanner} constructor through the {@link DocumentScannerConfig} to apply UI and business logic customizations for the {@link DocumentResultView}.
 *
 * @remarks
 * Only rare and edge-case scenarios require editing MDS source code. MDS uses sane default values for all omitted properties.
 *
 * @example
 * ```javascript
 * const documentScanner = new Dynamsoft.DocumentScanner({
 *     license: "YOUR_LICENSE_KEY_HERE", // Replace this with your actual license key
 *     resultViewConfig: {
 *         onDone: async (result) =>
 *         {
 *             const canvas = result.correctedImageResult.toCanvas();
 *             resultContainer.appendChild(canvas);
 *         }
 *     }
 * });
 * ```
 *
 * @public
 */
export interface DocumentResultViewConfig {
    /**
     * The HTML container element or selector for the {@link DocumentResultView} UI.
     *
     * @public
     */
    container?: HTMLElement | string;
    /**
     * Configures the appearance and labels of the buttons for the {@link DocumentResultView} UI.
     *
     * @see {@link DocumentResultViewToolbarButtonsConfig}
     *
     * @public
     */
    toolbarButtonsConfig?: DocumentResultViewToolbarButtonsConfig;
    /**
     * Handler called when the user clicks the "Done" button.
     *
     * @param result result of the scan, including the original image, corrected image, detected boundaries, and scan status
     * @see {@link DocumentResult}
     *
     * @public
     */
    onDone?: (result: DocumentResult) => Promise<void>;
    /**
     * Handler called when the user clicks the "Upload" button.
     *
     * @param result result of the scan, including the original image, corrected image, detected boundaries, and scan status
     * @see {@link DocumentResult}
     *
     * @public
     */
    onUpload?: (result: DocumentResult) => Promise<void>;
}

export default class DocumentResultView {
    private currentScanResultViewResolver?: (result: DocumentResult) => void;

    constructor(
        private resources: SharedResources,
        private config: DocumentResultViewConfig,
        private scannerView: DocumentScannerView,
        private correctionView: DocumentCorrectionView
    ) {}

    async launch(): Promise<DocumentResult> {
        try {
            const container = getElement(this.config.container!);
            container.textContent = "";

            // Ensure container fills available space
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.position = "relative";

            await this.initialize();
            container.style.display = "flex";

            // Return promise that resolves when user clicks done
            return new Promise(resolve => {
                this.currentScanResultViewResolver = resolve;
            });
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            return {
                status: {
                    code: EnumResultStatus.RS_FAILED,
                    message: errMsg
                }
            };
        }
    }

    private async handleUploadAndShareBtn(mode?: "share" | "upload") {
        try {
            const { result } = this.resources;
            if (!result?.correctedImageResult) {
                throw new Error("No image to upload");
            }

            if (mode === "upload" && this.config?.onUpload) {
                await this.config.onUpload(result);
            } else if (mode === "share") {
                await this.handleShare();
            }
        } catch (error) {
            console.error("Error on upload/share:", error);
            alert("Failed");
        }
    }

    private async handleShare() {
        try {
            const { result } = this.resources;

            // Validate input
            if (!result?.correctedImageResult) {
                throw new Error("No image result provided");
            }

            // Convert to blob
            const blob = await (result.correctedImageResult as DeskewedImageResultItem).toBlob("image/png");
            if (!blob) {
                throw new Error("Failed to convert image to blob");
            }

            // For Windows, we'll create a download fallback if sharing isn't supported
            const file = new File([blob], `document-${Date.now()}.png`, {
                type: blob.type
            });

            // Try Web Share API first
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: "Dynamsoft Document Scanner Shared Image"
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            return true;
        } catch (ex: any) {
            // Only show error if it's not a user cancellation
            if (ex.name !== "AbortError") {
                const errMsg = ex?.message || ex;
                console.error("Error sharing image:", errMsg);
                alert(`Error sharing image: ${errMsg}`);
            }
        }
    }

    private async handleCorrectImage() {
        try {
            if (!this.correctionView) {
                console.error("Correction View not initialized");
                return;
            }

            this.hideView();
            const result = await this.correctionView.launch();

            // After normalization is complete, show scan result view again with updated image
            if (result.correctedImageResult) {
                // Update the shared resources with new corrected result
                if (this.resources.onResultUpdated && this.resources.result) {
                    this.resources.onResultUpdated({
                        ...this.resources.result,
                        correctedImageResult: result.correctedImageResult
                    });
                }

                // Clear current scan result view and reinitialize with new image
                this.dispose(true); // true = preserve resolver
                await this.initialize();
                getElement(this.config.container!).style.display = "flex";
            }
        } catch (error) {
            console.error("DocumentResultView - Handle Correction View Error:", error);
            // Make sure to resolve with error if something goes wrong
            if (this.currentScanResultViewResolver) {
                this.currentScanResultViewResolver({
                    status: {
                        code: EnumResultStatus.RS_FAILED,
                        message: error?.message || error
                    }
                });
            }
            throw error;
        }
    }

    private async handleRetake() {
        try {
            if (!this.scannerView) {
                console.error("Correction View not initialized");
                return;
            }

            this.hideView();
            const result = await this.scannerView.launch();

            if (result?.status?.code === EnumResultStatus.RS_FAILED) {
                if (this.currentScanResultViewResolver) {
                    this.currentScanResultViewResolver(result);
                }
                return;
            }

            // Handle success case
            if (this.resources.onResultUpdated) {
                if (result?.status.code === EnumResultStatus.RS_CANCELLED) {
                    if (this.resources.result) {
                        this.resources.onResultUpdated(this.resources.result);
                    }
                } else if (result?.status.code === EnumResultStatus.RS_SUCCESS) {
                    this.resources.onResultUpdated(result);
                }
            }

            if (this.correctionView && result?._flowType) {
                if (shouldCorrectImage(result?._flowType)) {
                    await this.handleCorrectImage();
                }
            }

            this.dispose(true);
            await this.initialize();
            getElement(this.config.container!).style.display = "flex";
        } catch (error) {
            console.error("Error in retake handler:", error);
            // Make sure to resolve with error if something goes wrong
            if (this.currentScanResultViewResolver) {
                this.currentScanResultViewResolver({
                    status: {
                        code: EnumResultStatus.RS_FAILED,
                        message: error?.message || error
                    }
                });
            }
            throw error;
        }
    }

    private async handleDone() {
        try {
            if (this.config?.onDone && this.resources.result) {
                await this.config.onDone(this.resources.result);
            }

            // Resolve with current result
            if (this.currentScanResultViewResolver && this.resources.result) {
                this.currentScanResultViewResolver(this.resources.result);
            }

            // Clean up
            this.hideView();
            this.dispose();
        } catch (error) {
            console.error("Error in done handler:", error);
            // Make sure to resolve with error if something goes wrong
            if (this.currentScanResultViewResolver) {
                this.currentScanResultViewResolver({
                    status: {
                        code: EnumResultStatus.RS_FAILED,
                        message: error?.message || error
                    }
                });
            }
            throw error;
        }
    }

    private createControls(): HTMLElement {
        const { toolbarButtonsConfig, onUpload } = this.config;

        // Check if share is possible
        const testImageBlob = new Blob(["mock-png-data"], { type: "image/png" });
        const testFile = new File([testImageBlob], "test.png", { type: "image/png" });
        const canShare = "share" in navigator && navigator.canShare({ files: [testFile] });

        const buttons: ToolbarButton[] = [
            {
                id: `dds-scanResult-retake`,
                icon: toolbarButtonsConfig?.retake?.icon || DDS_ICONS.retake,
                label: toolbarButtonsConfig?.retake?.label || I18N_ZH.retake,
                onClick: () => this.handleRetake(),
                className: `${toolbarButtonsConfig?.retake?.className || ""}`,
                isHidden: toolbarButtonsConfig?.retake?.isHidden || false,
                isDisabled: !this.scannerView
            },
            {
                id: `dds-scanResult-correct`,
                icon: toolbarButtonsConfig?.correct?.icon || DDS_ICONS.normalize,
                label: toolbarButtonsConfig?.correct?.label || I18N_ZH.correction,
                onClick: () => this.handleCorrectImage(),
                className: `${toolbarButtonsConfig?.correct?.className || ""}`,
                isHidden: toolbarButtonsConfig?.correct?.isHidden || false,
                isDisabled: !this.correctionView
            },
            {
                id: `dds-scanResult-share`,
                icon: toolbarButtonsConfig?.share?.icon || (canShare ? DDS_ICONS.share : DDS_ICONS.downloadPNG),
                label: toolbarButtonsConfig?.share?.label || (canShare ? "Share" : "Download"),
                className: `${toolbarButtonsConfig?.share?.className || ""}`,
                isHidden: true, // Hide the Share button
                onClick: () => this.handleUploadAndShareBtn("share")
            },
            {
                id: `dds-scanResult-upload`,
                icon: toolbarButtonsConfig?.upload?.icon || DDS_ICONS.upload,
                label: toolbarButtonsConfig?.upload?.label || "Upload",
                className: `${toolbarButtonsConfig?.upload?.className || ""}`,
                isHidden: !onUpload ? true : toolbarButtonsConfig?.upload?.isHidden || false,
                isDisabled: !onUpload,
                onClick: () => this.handleUploadAndShareBtn("upload")
            },
            {
                id: `dds-scanResult-done`,
                icon: toolbarButtonsConfig?.done?.icon || DDS_ICONS.complete,
                label: toolbarButtonsConfig?.done?.label || I18N_ZH.done,
                className: `${toolbarButtonsConfig?.done?.className || ""}`,
                isHidden: toolbarButtonsConfig?.done?.isHidden || false,
                onClick: () => this.handleDone()
            }
        ];

        return createControls(buttons);
    }

    async initialize(): Promise<void> {
        try {
            if (!this.resources.result) {
                throw Error("Captured image is missing. Please capture an image first!");
            }

            if (!this.config.container) {
                throw new Error("Please create a Scan Result View Container element");
            }

            createStyle("dds-result-view-style", DEFAULT_RESULT_VIEW_CSS);

            // Create a wrapper div that preserves container dimensions
            const resultViewWrapper = document.createElement("div");
            resultViewWrapper.className = "dds-result-view-container";

            // Create and add scan result view image container
            const scanResultViewImageContainer = document.createElement("div");
            Object.assign(scanResultViewImageContainer.style, {
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "0"
            });

            // Add scan result image
            const correctedImage = this.resources.result.correctedImageResult as DeskewedImageResultItem;
            if (!correctedImage) {
                throw new Error("Corrected image result is missing");
            }

            const scanResultImg = correctedImage.toCanvas();
            if (!scanResultImg) {
                throw new Error("Failed to create canvas from corrected image");
            }

            Object.assign(scanResultImg.style, {
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain"
            });

            scanResultViewImageContainer.appendChild(scanResultImg);
            resultViewWrapper.appendChild(scanResultViewImageContainer);

            // Set up controls
            const controlContainer = this.createControls();

            // Override styling to remove the bar and create Mendix-style buttons
            controlContainer.style.background = "transparent";
            controlContainer.style.height = "auto";
            controlContainer.style.justifyContent = "center";
            controlContainer.style.padding = "2rem 1rem";
            controlContainer.style.gap = "1rem";

            resultViewWrapper.appendChild(controlContainer);

            getElement(this.config.container!).appendChild(resultViewWrapper);

            // Hide retake button on flow.STATIC_FILE
            if (this.resources.result._flowType === EnumFlowType.STATIC_FILE) {
                const retakeBtn = document.querySelector("#dds-scanResult-retake") as HTMLElement;
                retakeBtn.style.display = "none";
            }

            // Apply Mendix-style button styling
            const style = document.createElement("style");
            style.textContent = `
        .dds-controls {
          background: transparent !important;
        }
        .dds-control-btn {
          background: #1677ff !important;
          color: white !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 6px 14px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3) !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          margin: 0 6px !important;
          height: auto !important;
          flex: 0 1 auto !important;
          min-width: 90px !important;
        }
        .dds-control-btn:hover {
          background: #0050d6 !important;
          box-shadow: 0 4px 12px rgba(22, 119, 255, 0.4) !important;
          transform: translateY(-1px) !important;
        }
        .dds-control-btn:active {
          transform: translateY(0) !important;
          box-shadow: 0 2px 4px rgba(22, 119, 255, 0.3) !important;
        }
        .dds-control-btn svg {
          fill: white !important;
          color: white !important;
          width: 20px !important;
          height: 20px !important;
        }
        .dds-control-icon {
          fill: white !important;
          color: white !important;
        }
        .dds-control-icon-wrapper {
          display: flex !important;
          flex: none !important;
          margin-bottom: 1px !important;
        }
        .dds-control-text {
          flex: none !important;
          margin-top: 0 !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }
      `;
            document.head.appendChild(style);
        } catch (ex: any) {
            const errMsg = ex?.message || ex;
            console.error(errMsg);
            alert(errMsg);
        }
    }

    hideView(): void {
        if (this.config.container) {
            getElement(this.config.container).style.display = "none";
        }
    }

    dispose(preserveResolver = false): void {
        // Clean up the container
        if (this.config.container) {
            getElement(this.config.container).textContent = "";
        }

        // Clear resolver only if not preserving
        if (!preserveResolver) {
            this.currentScanResultViewResolver = undefined;
        }
    }
}

const DEFAULT_RESULT_VIEW_CSS = `
  .dds-result-view-container {
    display: flex;
    width: 100%;
    height: 100%;
    background-color: transparent;
    font-size: 12px;
    flex-direction: column;
    align-items: center;
  }

  @media (orientation: landscape) and (max-width: 1024px) {
    .dds-result-view-container {
      flex-direction: row;
    }
  }
`;
