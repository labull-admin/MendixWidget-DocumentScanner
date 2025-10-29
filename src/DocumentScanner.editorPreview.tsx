import { ReactElement, createElement } from "react";
import { DocumentScannerPreviewProps } from "../typings/DocumentScannerProps";

export function preview({ class: className, styleObject }: DocumentScannerPreviewProps): ReactElement {
    return (
        <div
            className={`document-scanner-preview ${className}`}
            style={{
                width: "100%",
                height: "100%",
                minHeight: "400px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed #ccc",
                backgroundColor: "#f5f5f5",
                ...styleObject
            }}
        >
            <div style={{ textAlign: "center", padding: "20px" }}>
                <h3>Document Scanner</h3>
                <p>Auto Crop & Smart Capture: Enabled</p>
            </div>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/DocumentScanner.css");
}
