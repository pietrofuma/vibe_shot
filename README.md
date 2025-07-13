# vibe_shot
# Privacy Policy for Vibe-shot

**Last Updated:** [07/13/2025]

Welcome to Vibe-shot. We are committed to protecting your privacy and handling your data in an open and transparent manner. This privacy policy outlines our practices concerning the data processed by the Vibe-shot Chrome extension.

Our guiding principle is **user-centric privacy**: the data you create belongs to you and should remain on your device. Vibe-shot is designed to function without any central servers and we have no interest in collecting your personal information.

### 1. Data We Do Not Collect

To be perfectly clear, we **DO NOT** collect, transmit, or store any of the following information on any external servers:
*   Your browsing history.
*   Your IP address or location.
*   Your personal information, such as name or email address.
*   Any analytics or usage data.
*   The content of your screenshots.

All functionalities of Vibe-shot are performed locally on your computer.

### 2. Data Stored Locally on Your Device

Vibe-shot stores data exclusively within your browser's secure local storage (`chrome.storage.local` and `chrome.storage.session`). This data is necessary for the extension to function and includes:

*   **Screenshots:** The images you capture are temporarily stored as WebP data URLs in your browser's local storage. This allows you to access them later from the extension's popup.
*   **Associated Metadata:** For each screenshot, the URL of the web page where it was captured (`sourceUrl`) is saved. This is done to provide you with context and is displayed as a tooltip in the popup. This information is also stored only on your device.
*   **User Preferences:** Settings, such as the state of the "Copy & Remove" toggle, are saved locally so the extension can remember your preferences across browser sessions.
*   **Session Data:** A temporary session flag (`newScreenshotId`) is used to highlight the most recently captured screenshot. This data is automatically cleared when the session ends.

### 3. Data Deletion Policy

You have complete control over your data.
*   **Manual Deletion:** You can delete any screenshot individually or all screenshots at once using the "Remove" and "Clear All" buttons in the extension's popup.
*   **Automatic Deletion:** The "Copy & Remove" feature, when enabled, automatically deletes a screenshot after it has been copied to the clipboard or dragged to another application.
*   **Time-Based Deletion:** As a core feature of Vibe-shot, all stored screenshots and their associated metadata are automatically and permanently deleted from your local storage every 120 minutes. This is a non-configurable safeguard to ensure your data remains temporary and your browser's storage is not consumed over time.

### 4. Justification of Required Permissions

Vibe-shot requests the minimum permissions necessary to provide its features. Here is a detailed explanation of why each permission is required:

*   **`storage`**: **Required** to save your screenshots, their source URLs, and your settings locally on your computer. This is the core mechanism that allows the extension to work.
*   **`activeTab`** & **`scripting`**: **Required** to inject the content script that enables you to select an area of the screen to capture. This script is only injected when you explicitly trigger a capture via the shortcut or popup button.
*   **`host_permissions` ("<all_urls>")**: **Required** to allow the `scripting` permission to function on any website you are currently browsing. Vibe-shot does not use this permission to read your data or track your browsing activity; it is solely to enable the screen capture functionality wherever you need it.
*   **`notifications`**: **Required** to display system notifications that provide you with immediate feedback, for example, confirming that a screenshot was successfully captured and copied to the clipboard.
*   **`clipboardWrite`**: **Required** to allow the extension to copy the captured image to your system's clipboard. This is a primary feature of Vibe-shot.
*   **`offscreen`**: **Required** to process images. Since the extension's background service worker cannot directly manipulate images on a canvas, this permission allows Vibe-shot to create a temporary, invisible document to handle image cropping and conversion to the WebP format.
*   **`alarms`**: **Required** to schedule the automatic cleanup task that deletes all screenshots every 120 minutes.

### 5. Third-Party Services

Vibe-shot does not use any third-party services, analytics tools, or advertising networks.

### 6. Changes to This Privacy Policy

We may update this Privacy Policy to reflect changes in our extension's functionality or to comply with new regulations. If we make changes, we will update the "Last Updated" date at the top of this policy. We encourage you to review this policy periodically.

### 7. Contact Information

If you have any questions, concerns, or feedback regarding this Privacy Policy or the practices of Vibe-shot, please contact us through the support options available on the Chrome Web Store listing or by opening an issue on our project's code repository.

[Link to your GitHub Repository or Support Page]
