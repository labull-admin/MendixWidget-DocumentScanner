/**
 * This file was generated from DocumentScanner.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ActionValue, DynamicValue, EditableValue } from "mendix";

export interface DocumentScannerContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    license: DynamicValue<string>;
    scannedImageAttribute: EditableValue<string>;
    heightPercentage: number;
    onDone?: ActionValue;
    uiPath?: DynamicValue<string>;
    engineRootPath?: DynamicValue<string>;
    textTakePhoto?: DynamicValue<string>;
    textClose?: DynamicValue<string>;
    textRetake?: DynamicValue<string>;
    textDone?: DynamicValue<string>;
    textDetectBorders?: DynamicValue<string>;
    textAutoCrop?: DynamicValue<string>;
    textSmartCapture?: DynamicValue<string>;
    textUploadImage?: DynamicValue<string>;
}

export interface DocumentScannerPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    license: string;
    scannedImageAttribute: string;
    heightPercentage: number | null;
    onDone: {} | null;
    uiPath: string;
    engineRootPath: string;
    textTakePhoto: string;
    textClose: string;
    textRetake: string;
    textDone: string;
    textDetectBorders: string;
    textAutoCrop: string;
    textSmartCapture: string;
    textUploadImage: string;
}
