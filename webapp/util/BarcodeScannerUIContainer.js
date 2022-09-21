/*!
 * SAPUI5

(c) Copyright 2009-2020 SAP SE. All rights reserved
 */

sap.ui.define([
    "sap/ui/core/Control"
], function(Control) {
"use strict";

var BarcodeScannerUIContainer =  Control.extend("sap.ndc.BarcodeScannerUIContainer", {

    // the control API:
    metadata : {
        properties : {
            "prefixId" : "string"
        }
    },

    renderer : {
        apiVersion: 2,
        render: function(oRm, oControl) {
            // Video element that is visible to user
            oRm.openStart("div", oControl);
            oRm.class("sapNdcRTCDialogVideo");
            oRm.openEnd();
                oRm.openStart("video", oControl.getId() + "-video");
                oRm.attr("autoplay", "autoplay");
                oRm.attr("webkit-playsinline", "webkit-playsinline");
                oRm.attr("playsinline", "playsinline");
                oRm.class("sapNdcRTCDialogVideoContainer");
                oRm.openEnd();
                oRm.close("video");
            oRm.close("div");

            // Overlay that is used to mark scan area
            oRm.openStart("div", oControl.getId() + "-overlay");
            oRm.class("sapNdcRTCDialogOverlay");
            oRm.openEnd();
                oRm.openStart("div", oControl.getId() + "-overlay-box");
                oRm.class("sapNdcRTCDialogOverlayBox");
                oRm.openEnd();
                    oRm.openStart("div", oControl.getId() + "-overlay-line");
                    oRm.class("sapNdcRTCDialogOverlayLine");
                    oRm.openEnd();
                    oRm.close("div");
                    oRm.openStart("div");
                    oRm.class("sapNdcRTCDialogOverlayAngle");
                    oRm.openEnd();
                    oRm.close("div");
                oRm.close("div");
            oRm.close("div");

            // Div that highlights scanned barcode
            oRm.openStart("div", oControl.getId() + "-highlight");
            oRm.attr("hidden", true);
            oRm.class("sapNdcRTCDialogHighlight");
            oRm.openEnd();
            oRm.close("div");
        }
    }
});

return BarcodeScannerUIContainer;
});