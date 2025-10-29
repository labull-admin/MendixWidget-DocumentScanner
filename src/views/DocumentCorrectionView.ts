import {
    EnumCapturedResultItemType,
    Point,
    Quadrilateral,
    DrawingLayer,
    DrawingStyleManager,
    ImageEditorView,
    QuadDrawingItem,
    DetectedQuadResultItem,
    DeskewedImageResultItem
} from "dynamsoft-capture-vision-bundle";
import { SharedResources } from "../sdk/DocumentScanner";
import { createControls, createStyle, getElement } from "./utils";
import { DDS_ICONS } from "./utils/icons";
import {
    ToolbarButtonConfig,
    DEFAULT_TEMPLATE_NAMES,
    DocumentResult,
    EnumResultStatus,
    UtilizedTemplateNames,
    ToolbarButton,
    EnumFlowType
} from "./utils/types";
import DocumentScannerView from "./DocumentScannerView";

const I18N_ZH = {
    capturedImageMissing: "缺少已捕获的图像。请先进行拍摄！",
    createCorrectionContainer: "请创建校正视图容器元素",
    retake: "重新拍摄",
    fullImage: "整张图片",
    detectBorders: "边框检测",
    done: "完成",
    apply: "确认",
    noImageAvailableForCorrection: "没有可用于校正的图像"
};

export interface DocumentCorrectionViewToolbarButtonsConfig {
    retake?: ToolbarButtonConfig;
    fullImage?: ToolbarButtonConfig;
    detectBorders?: ToolbarButtonConfig;
    apply?: ToolbarButtonConfig;
}

/**
 * The `DocumentCorrectionViewConfig` interface passes settings to the {@link DocumentScanner} constructor through the {@link DocumentScannerConfig} to apply UI and business logic customizations for the {@link DocumentCorrectionView}.
 *
 * @remarks
 * Only rare and edge-case scenarios require editing MDS source code. MDS uses sane default values for all omitted properties.
 *
 * @example
 * ```javascript
 * const documentScanner = new Dynamsoft.DocumentScanner({
 *     license: "YOUR_LICENSE_KEY_HERE", // Replace this with your actual license key
 *     correctionViewConfig: {
 *         onFinish: (result) => {
 *             const canvas = result.correctedImageResult.toCanvas();
 *             resultContainer.appendChild(canvas);
 *         }
 *     }
 * });
 * ```
 *
 * @public
 */
export interface DocumentCorrectionViewConfig {
    /**
     * The HTML container element or selector for the {@link DocumentCorrectionView} UI.
     *
     * @public
     */
    container?: HTMLElement | string;
    /**
     * Configures the appearance and labels of the buttons for the {@link DocumentCorrectionView} UI.
     *
     * @see {@link DocumentCorrectionViewToolbarButtonsConfig}
     *
     * @public
     */
    toolbarButtonsConfig?: DocumentCorrectionViewToolbarButtonsConfig;
    /**
     * Path to a Capture Vision template for scanning configuration.
     *
     * @remarks
     * This typically does not need to be set as MDS provides a default template for general use. You may set custom names to self-host resources, or fully self-host MDS.
     * @see {@link https://www.dynamsoft.com/mobile-document-scanner/docs/web/guide/index.html#self-host-resources | self-hosting resources}
     * @see {@link https://www.dynamsoft.com/capture-vision/docs/core/parameters/file/capture-vision-template.html?lang=javascript | DCV Templates}
     *
     * @defaultValue {@link DEFAULT_DCE_UI_PATH}
     *
     * @public
     */
    templateFilePath?: string;
    /**
     * Capture Vision template names for detection and correction.
     *
     * @remarks
     * This typically does not need to be set as MDS provides a default template for general use. You may set custom names to self-host resources, or fully self-host MDS.
     * @see {@link https://www.dynamsoft.com/mobile-document-scanner/docs/web/guide/index.html#self-host-resources | self-hosting resources}
     * @see {@link https://www.dynamsoft.com/capture-vision/docs/core/parameters/file/capture-vision-template.html?lang=javascript | DCV Templates}
     *
     * @defaultValue {@link DEFAULT_TEMPLATE_NAMES}
     *
     * @public
     */
    utilizedTemplateNames?: UtilizedTemplateNames;
    /**
     * Handler called when the user clicks the "Apply" button.
     *
     * @param result result of the scan, including the original image, corrected image, detected boundaries, and scan status
     * @see {@link DocumentResult}
     *
     * @public
     */
    onFinish?: (result: DocumentResult) => void;
    /**
     * @privateRemarks
     * Changes the label of the "Apply" button to "Done" if the {@link DocumentResultView} is not configured.
     *
     * @internal
     */
    _showResultView?: boolean;
}

export default class DocumentCorrectionView {
    private imageEditorView: ImageEditorView | null = null;
    private layer: DrawingLayer | null = null;
    private currentCorrectionResolver?: (result: DocumentResult) => void;

    constructor(
        private resources: SharedResources,
        private config: DocumentCorrectionViewConfig,
        private scannerView: DocumentScannerView
    ) {
        this.config.utilizedTemplateNames = {
            detect: config.utilizedTemplateNames?.detect || DEFAULT_TEMPLATE_NAMES.detect,
            normalize: config.utilizedTemplateNames?.normalize || DEFAULT_TEMPLATE_NAMES.normalize
        };
    }

    async initialize(): Promise<void> {
        if (!this.resources.result) {
            throw Error(I18N_ZH.capturedImageMissing);
        }

        if (!this.resources.result.originalImageResult) {
            throw Error(I18N_ZH.capturedImageMissing);
        }

        if (!this.config.container) {
            throw new Error(I18N_ZH.createCorrectionContainer);
        }

        createStyle("dds-correction-view-style", DEFAULT_CORRECTION_VIEW_CSS);

        // Create a wrapper div that preserves container dimensions
        const correctionViewWrapper = document.createElement("div");
        correctionViewWrapper.className = "dds-correction-view-container";

        // Ensure wrapper fills the container
        Object.assign(correctionViewWrapper.style, {
            width: "100%",
            height: "100%",
            position: "relative"
        });

        // Add image editor view from DCE to correct documents
        const imageEditorViewElement = document.createElement("div");
        Object.assign(imageEditorViewElement.style, {
            width: "100%",
            height: "100%"
        });

        correctionViewWrapper.appendChild(imageEditorViewElement);

        const container = getElement(this.config.container!);
        container.appendChild(correctionViewWrapper);

        // Ensure parent container also fills properly
        container.style.width = "100%";
        container.style.height = "100%";

        this.imageEditorView = await ImageEditorView.createInstance(imageEditorViewElement);
        this.layer = this.imageEditorView.createDrawingLayer();
        this.imageEditorView.setOriginalImage(this.resources.result.originalImageResult);

        this.setupDrawingLayerStyle(); // Set style for drawing layer
        this.setupInitialDetectedQuad();
        this.setupCorrectionControls();
        this.setupQuadConstraints();

        // Hide retake button on flow.STATIC_FILE
        if (this.resources.result._flowType === EnumFlowType.STATIC_FILE) {
            const retakeBtn = document.querySelector("#dds-correction-retake") as HTMLElement;
            retakeBtn.style.display = "none";
        }
    }

    private setupDrawingLayerStyle() {
        if (!this.layer) {
            throw new Error("Layer is not initialized");
        }
        const styleID = DrawingStyleManager.createDrawingStyle({
            lineWidth: 5,
            fillStyle: "transparent",
            strokeStyle: "#FE8E14",
            paintMode: "stroke"
        });

        this.layer.setDefaultStyle(styleID);
    }

    private setupQuadConstraints() {
        if (!this.layer) {
            throw new Error("Layer is not initialized");
        }
        const canvas = this.layer.fabricCanvas;

        canvas.defaultCursor = "default";
        canvas.hoverCursor = "default";
        canvas.moveCursor = "default";

        canvas.on("object:scaling", (e: any) => {
            const obj = e.target;
            const points = obj.points;
            const bounds = this.getCanvasBounds();

            // Constrain scaling to canvas bounds
            points.forEach((point: Point) => {
                point.x = Math.max(0, Math.min(bounds.width, point.x));
                point.y = Math.max(0, Math.min(bounds.height, point.y));
            });

            obj.set({
                points,
                dirty: true
            });
            canvas.renderAll();
        });

        canvas.on("object:modified", (e: any) => {
            const obj = e.target;
            if (!obj) {
                return;
            }

            const points = obj.points;
            const bounds = this.getCanvasBounds();

            // Ensure all points stay within bounds
            let needsConstraint = false;
            points.forEach((point: Point) => {
                if (point.x < 0 || point.x > bounds.width || point.y < 0 || point.y > bounds.height) {
                    needsConstraint = true;
                }
            });

            if (needsConstraint) {
                points.forEach((point: Point) => {
                    point.x = Math.max(0, Math.min(bounds.width, point.x));
                    point.y = Math.max(0, Math.min(bounds.height, point.y));
                });

                obj.set({
                    points,
                    dirty: true
                });
                canvas.renderAll();
            }
        });
    }

    private getCanvasBounds() {
        if (!this.layer) {
            throw new Error("Layer is not initialized");
        }
        const canvas = this.layer.fabricCanvas;
        return {
            width: canvas.getWidth(),
            height: canvas.getHeight()
        };
    }

    private addQuadToLayer(newQuad: QuadDrawingItem) {
        if (!this.layer) {
            throw new Error("Layer is not initialized");
        }
        this.layer.clearDrawingItems();

        const fabricObject = newQuad._getFabricObject();

        if (!this.resources.result || !this.resources.result.originalImageResult) {
            throw new Error("Original image is missing");
        }

        const cornerSize =
            Math.min(
                this.resources.result.originalImageResult.width,
                this.resources.result.originalImageResult.height
            ) * 0.1;

        fabricObject.cornerSize = cornerSize;

        // Make quad non-draggable but keep corner controls
        fabricObject.lockMovementX = true;
        fabricObject.lockMovementY = true;

        // Make circle transparent to show corner on drag
        fabricObject.on("mousedown", (e: any) => {
            if (e.target && e.target.controls) {
                fabricObject.cornerColor = "transparent";
                fabricObject.dirty = true;
                fabricObject.canvas?.renderAll();
            }
        });

        fabricObject.on("mouseup", () => {
            fabricObject.cornerColor = "#FE8E14";
            fabricObject.dirty = true;
            fabricObject.canvas?.renderAll();
        });

        this.layer.renderAll();
        this.layer.addDrawingItems([newQuad]);

        // Select the quad immediately after adding it
        this.layer.fabricCanvas.setActiveObject(fabricObject);
        this.layer.fabricCanvas.renderAll();
    }

    private setupInitialDetectedQuad() {
        if (!this.resources.result) {
            throw new Error("Result is missing");
        }
        let quad: QuadDrawingItem;
        // Draw the detected quadrilateral
        if (this.resources.result.detectedQuadrilateral) {
            quad = new QuadDrawingItem(this.resources.result.detectedQuadrilateral);
        } else {
            // If no quad detected, draw full image quad
            if (!this.resources.result.originalImageResult) {
                throw new Error("Original image is missing");
            }
            const { width, height } = this.resources.result.originalImageResult;
            quad = new QuadDrawingItem({
                points: [
                    { x: 0, y: 0 },
                    { x: width, y: 0 },
                    { x: width, y: height },
                    { x: 0, y: height }
                ],
                area: width * height
            } as Quadrilateral);
        }

        this.addQuadToLayer(quad);
    }

    private createControls(): HTMLElement {
        const { toolbarButtonsConfig } = this.config;

        const buttons: ToolbarButton[] = [
            {
                id: `dds-correction-retake`,
                icon: toolbarButtonsConfig?.retake?.icon || DDS_ICONS.retake,
                label: toolbarButtonsConfig?.retake?.label || I18N_ZH.retake,
                onClick: () => this.handleRetake(),
                className: `${toolbarButtonsConfig?.retake?.className || ""}`,
                isHidden: toolbarButtonsConfig?.retake?.isHidden || false,
                isDisabled: !this.scannerView
            },
            {
                id: `dds-correction-fullImage`,
                icon: toolbarButtonsConfig?.fullImage?.icon || DDS_ICONS.fullImage,
                label: toolbarButtonsConfig?.fullImage?.label || I18N_ZH.fullImage,
                className: `${toolbarButtonsConfig?.fullImage?.className || ""}`,
                isHidden: true, // Hide the full image button
                onClick: () => this.setFullImageBoundary()
            },
            {
                id: `dds-correction-detectBorders`,
                icon: toolbarButtonsConfig?.detectBorders?.icon || DDS_ICONS.autoBounds,
                label: toolbarButtonsConfig?.detectBorders?.label || I18N_ZH.detectBorders,
                className: `${toolbarButtonsConfig?.detectBorders?.className || ""}`,
                isHidden: true, // Hide the detect borders button
                onClick: () => this.setBoundaryAutomatically()
            },
            {
                id: `dds-correction-apply`,
                icon:
                    toolbarButtonsConfig?.apply?.icon ||
                    (this.config?._showResultView === false ? DDS_ICONS.complete : DDS_ICONS.finish),
                label:
                    toolbarButtonsConfig?.apply?.label ||
                    (this.config?._showResultView === false ? I18N_ZH.done : I18N_ZH.apply),
                className: `${toolbarButtonsConfig?.apply?.className || ""}`,
                isHidden: toolbarButtonsConfig?.apply?.isHidden || false,

                onClick: () => this.confirmCorrection()
            }
        ];

        return createControls(buttons);
    }

    private setupCorrectionControls() {
        try {
            const controlContainer = this.createControls();

            // Override styling to remove the bar and create Mendix-style buttons
            controlContainer.style.background = "transparent";
            controlContainer.style.height = "auto";
            controlContainer.style.justifyContent = "center";
            controlContainer.style.padding = "1.5rem 1rem";
            controlContainer.style.gap = "1rem";

            if (!this.config.container) {
                throw new Error("Container is missing");
            }
            const wrapper = getElement(this.config.container!).firstElementChild as HTMLElement;
            if (wrapper) {
                wrapper.appendChild(controlContainer);
            }

            // Apply Mendix-style button styling with smaller height
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
          padding: 6px 18px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3) !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          margin: 0 8px !important;
          height: auto !important;
          flex: 0 1 auto !important;
          min-width: 100px !important;
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
          width: 22px !important;
          height: 22px !important;
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
          font-size: 13px !important;
          font-weight: 500 !important;
        }
      `;
            document.head.appendChild(style);
        } catch (error) {
            console.error("Error setting up correction controls:", error);
            throw new Error(`Failed to setup correction controls: ${error.message}`);
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
                if (this.currentCorrectionResolver) {
                    this.currentCorrectionResolver(result);
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

            this.dispose(true);
            await this.initialize();
            getElement(this.config.container!).style.display = "flex";
        } catch (error) {
            console.error("Error in retake handler:", error);
            // Make sure to resolve with error if something goes wrong
            if (this.currentCorrectionResolver) {
                this.currentCorrectionResolver({
                    status: {
                        code: EnumResultStatus.RS_FAILED,
                        message: error?.message || error
                    }
                });
            }
            throw error;
        }
    }

    setFullImageBoundary() {
        if (!this.resources.result || !this.resources.result.originalImageResult) {
            throw Error("Captured image is missing. Please capture an image first!");
        }

        // Reset quad to full image
        const { width, height } = this.resources.result.originalImageResult;
        const fullQuad = new QuadDrawingItem({
            points: [
                { x: 0, y: 0 },
                { x: width, y: 0 },
                { x: width, y: height },
                { x: 0, y: height }
            ],
            area: width * height
        } as Quadrilateral);

        this.addQuadToLayer(fullQuad);
    }

    async setBoundaryAutomatically() {
        if (!this.resources.result || !this.resources.result.originalImageResult) {
            throw new Error("Original image is missing");
        }

        if (!this.resources.cvRouter) {
            throw new Error("CV Router not initialized");
        }

        if (!this.config.utilizedTemplateNames?.detect) {
            throw new Error("Template names not configured");
        }

        // Auto detect bounds
        if (this.config.templateFilePath) {
            await this.resources.cvRouter?.initSettings(this.config.templateFilePath);
        }

        const newSettings = await this.resources.cvRouter?.getSimplifiedSettings(
            this.config.utilizedTemplateNames.detect
        );
        if (!newSettings) {
            throw new Error("Failed to get settings");
        }
        newSettings.outputOriginalImage = true;
        await this.resources.cvRouter?.updateSettings(this.config.utilizedTemplateNames.detect, newSettings);

        if (this.resources.cvRouter) {
            this.resources.cvRouter.maxImageSideLength = Infinity;
        }

        const result = await this.resources.cvRouter?.capture(
            this.resources.result.originalImageResult,
            "DetectDocumentBoundaries_Default"
        );

        const quad = (
            result?.items.find(
                item => item.type === EnumCapturedResultItemType.CRIT_DETECTED_QUAD
            ) as DetectedQuadResultItem
        )?.location;

        if (quad) {
            this.addQuadToLayer(new QuadDrawingItem(quad));
        } else {
            this.setFullImageBoundary();
        }
    }

    async confirmCorrection() {
        if (!this.layer) {
            throw new Error("Layer is not initialized");
        }
        const drawingItem = this.layer.getDrawingItems()[0] as QuadDrawingItem;
        if (!drawingItem) {
            throw new Error("No quad drawing item found");
        }
        const quad = drawingItem.getQuad();
        const correctedImg = await this.correctImage(quad?.points);
        if (correctedImg && this.resources.result) {
            const updatedResult = {
                ...this.resources.result,
                correctedImageResult: correctedImg,
                detectedQuadrilateral: quad
            };

            if (this.resources.onResultUpdated) {
                // Update the result with new corrected image and quad
                this.resources.onResultUpdated(updatedResult);
            }

            // Call onFinish callback if provided
            if (this.config?.onFinish) {
                this.config.onFinish(updatedResult);
            }

            // Resolve the promise with corrected image
            if (this.currentCorrectionResolver) {
                this.currentCorrectionResolver(updatedResult);
            }
        } else {
            if (this.currentCorrectionResolver && this.resources.result) {
                this.currentCorrectionResolver(this.resources.result);
            }
        }

        // Clean up and hide
        this.dispose();
        this.hideView();
    }

    async launch(): Promise<DocumentResult> {
        try {
            if (!this.resources.result?.correctedImageResult) {
                return {
                    status: {
                        code: EnumResultStatus.RS_FAILED,
                        message: "No image available for correction"
                    }
                };
            }

            const container = getElement(this.config.container!);
            container.textContent = "";

            // Ensure container fills available space
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.position = "relative";

            await this.initialize();
            container.style.display = "flex";

            // Return promise that resolves when user clicks finish
            return new Promise(resolve => {
                this.currentCorrectionResolver = resolve;
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

    hideView(): void {
        if (this.config.container) {
            getElement(this.config.container).style.display = "none";
        }
    }

    /**
     * Normalize an image with DDN given a set of points
     * @param points - points provided by either users or DDN's detect quad
     * @returns normalized image by DDN
     */
    async correctImage(points: Quadrilateral["points"]): Promise<DeskewedImageResultItem> {
        if (!this.resources.result || !this.resources.result.originalImageResult) {
            throw new Error("Original image is missing");
        }

        if (!this.resources.cvRouter) {
            throw new Error("CV Router not initialized");
        }

        if (!this.config.utilizedTemplateNames?.normalize) {
            throw new Error("Template names not configured");
        }

        const { cvRouter } = this.resources;

        if (this.config.templateFilePath) {
            await this.resources.cvRouter?.initSettings(this.config.templateFilePath);
        }

        const settings = await cvRouter?.getSimplifiedSettings(this.config.utilizedTemplateNames.normalize);
        if (!settings) {
            throw new Error("Failed to get settings");
        }
        settings.roiMeasuredInPercentage = false;
        settings.roi.points = points;
        await cvRouter?.updateSettings(this.config.utilizedTemplateNames.normalize, settings);

        const result = await cvRouter?.capture(
            this.resources.result.originalImageResult,
            this.config.utilizedTemplateNames.normalize
        );

        // If deskewed result found by DDN
        if (result?.processedDocumentResult?.deskewedImageResultItems?.[0]) {
            return result.processedDocumentResult.deskewedImageResultItems[0];
        }
        if (!result) {
            throw new Error("CV Router not initialized");
        }
        throw new Error("Failed to generate corrected image");
    }

    dispose(preserveResolver = false): void {
        // Clean up resources
        if (this.imageEditorView?.dispose) {
            this.imageEditorView.dispose();
        }
        this.layer = null;

        // Clean up the container
        if (this.config.container) {
            getElement(this.config.container).textContent = "";
        }

        // Clear resolver only if not preserving
        if (!preserveResolver) {
            this.currentCorrectionResolver = undefined;
        }
    }
}

const DEFAULT_CORRECTION_VIEW_CSS = `
  .dds-correction-view-container {
    display: flex;
    width: 100%;
    height: 100%;
    background-color: transparent;
    font-size: 12px;
    flex-direction: column;
    align-items: center;
  }

  @media (orientation: landscape) and (max-width: 1024px) {
    .dds-correction-view-container {
      flex-direction: row;
    }
  }
`;
