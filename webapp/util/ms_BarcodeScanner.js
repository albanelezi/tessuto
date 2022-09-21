/*!
 * SAPUI5

(c) Copyright 2009-2020 SAP SE. All rights reserved
 */


// configure shim for zxing library to allow AMD-like import
sap.ui.loader.config({
	shim: {
		'../util/ZXing': {
			amd: true,
			exports: 'ZXing'
		}
	}
});

sap.ui.define([
		"sap/base/Log",
		'sap/ui/model/json/JSONModel',
		'sap/ui/model/resource/ResourceModel',
		'sap/m/Input',
		'sap/m/Label',
		'sap/m/Button',
		'sap/m/Dialog',
		"sap/ui/dom/includeStylesheet",
		"./BarcodeScannerUIContainer",
		"./ZXing"
	],
	function(Log, JSONModel, ResourceModel, Input, Label, Button, Dialog, includeStylesheet, BarcodeScannerUIContainer) {
	"use strict";

	/*global cordova*/
	document.addEventListener("settingsDone", init);
	document.addEventListener("SettingCompleted", init);
	document.addEventListener("mockSettingsDone", init);

	includeStylesheet({
		//url: sap.ui.require.toUrl("./sapNdcBarcodeScanner.css")
		url: "./util/sapNdcBarcodeScanner.css"
	});

	/**
	 * @class
	 * TODO: description
	 *
	 * As <code>BarcodeScanner</code> is a static class, a <code>sap.ui.define();</code>
	 * statement must be explicitly executed before the class can be used. Example:	 *
	 * <pre>
	 * sap.ui.define(["sap/ndc/BarcodeScanner"], function(BarcodeScanner) {
	 * 	sap.ndc.BarcodeScanner.scan(
	 * 		function (oResult) { / * process scan result * / },
	 * 		function (oError) { / * handle scan error * / },
	 * 		function (oResult) { / * handle input dialog change * / }
	 * 	);
	 * });
	 * </pre>
	 *
	 * @author SAP SE
	 * @since 1.28.0
	 *
	 * @namespace
	 * @public
	 * @alias sap.ndc.BarcodeScanner
	 */
	var BarcodeScanner = {},

	/* =========================================================== */
	/* Internal methods and properties							 */
	/* =========================================================== */

		oCordovaScannerAPI,
		oZXingScannerAPI,
		oZXing,

		oStatusModel = new JSONModel({
			available: false
		}),
		oScanDialog = null,
		oScanDialogController = {},
		oDialogTitle = "",

		defaultConstraints = {
			audio: false,
			video: {
				height: {
					min: 480,
					ideal: 960,
					max: 1440
				},
				aspectRatio: 1.333333333,
				facingMode: 'environment'
			}
		},

		oBarcodeScannerUIContainer = null,

		oBarcodeVideoDOM,
		oBarcodeOverlayDOM,
		oBarcodeHighlightDOM,
		imgTruncX = 0,
		imgTruncY = 0,

		bBarcodeOverlaySetup = false,

		bReady = true,			// No scanning is in progress
		// TODO: following var is not used, right now it is useless // bInitialized = false,	// Flag indicating whether the feature vector (sap.Settings) is available
								// sap.Settings might be loaded later, so it is checked again the next scan
		oResourceModel = new ResourceModel({
			bundleName: "sap.ndc.messagebundle"
		});

	function getFeatureAPI() {
		try {
			oCordovaScannerAPI = cordova.plugins.barcodeScanner;
			if (oCordovaScannerAPI) {
				Log.debug("Cordova BarcodeScanner plugin is available!");
			} else {
				Log.error("BarcodeScanner: cordova.plugins.barcodeScanner is not available");
				getZXingAPI();
			}
		} catch (e) {
			Log.info("BarcodeScanner: cordova.plugins is not available");
			getZXingAPI();
		}
	}

	function getZXingAPI() {
		oZXing = ZXing;
		//oZXing = sap.ui.requireSync.toUrl("/../util/ms_BarcodeScanner");
		if (oZXing) {
			oZXingScannerAPI = new oZXing.BrowserMultiFormatReader();
			if (oZXingScannerAPI) {
				Log.debug("ZXing BrowserMultiFormatReader API is available!");
			} else {
				oStatusModel.setProperty("/available", false);
				Log.error("BarcodeScanner: ZXing BrowserMultiFormatReader API is not available");
			}
		} else {
			oStatusModel.setProperty("/available", false);
			Log.error("BarcodeScanner: Scanner API is not available");
		}
	}


	/**
	 * Used to detect browsers which does not have access to html5 user media api and cant use device camera
	 * @private
	 * @returns {boolean} true is user media access supported by html5 compatible browser
	 */
	function isUserMediaAccessSupported() {
		return !!(window && window.navigator && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia);
	}

	function checkCordovaInIframe() {
		try {
			if (self != top && typeof cordova === "undefined") {
				// self != top, means the app is loaded in an iframe.
				// typeof cordova === "undefined", means cannot find cordova plugins in the iframe.
				// Now assign top.cordova to window.cordova variable in current iframe.
				window.cordova = top.cordova;
			}
		} catch (err) {
			// Catch the DOMException in the cross-origin iframe. Cordova doesn't support cross-origin
			Log.info("BarcodeScanner: cordova is not available in cross-origin iframe");
		}
	}

	// Check:
	//	* Feature vector (sap.Settings.isFeatureEnabled) is available
	//  * Barcode scanner is enabled by the Feature Vector
	//  * Barcode scanner Cordova plug-in (cordova.plugins.barcodeScanner) or zxing-js (ZXing.BrowserMultiFormatReader) is available
	function init() {
		checkCordovaInIframe();
		oCordovaScannerAPI = null;
		oZXingScannerAPI = null;
		oZXing = null;

		//true by default and only false if feature is forbidden from feature vector
		oStatusModel.setProperty("/available", true);
		//sap.Settings is provided by Kapsel SettingsExchange plugin.
		if (sap.Settings === undefined) {
			//native device capabilities should be by default enabled if there is no feature vector
			//available to restrict the capability.
			Log.debug("No sap.Settings. No feature vector available.");
			//still try to check if only barcode scanner plugin is present without the settings plugin.
			getFeatureAPI();
		} else if (sap.Settings && typeof sap.Settings.isFeatureEnabled === "function") {
			// TODO: following var is not used, right now it is useless // bInitialized = true;
			sap.Settings.isFeatureEnabled("cordova.plugins.barcodeScanner",
				// Feature check success
				function (bEnabled) {
					if (bEnabled) {
						getFeatureAPI();
					} else {
						oStatusModel.setProperty("/available", false);
						Log.warning("BarcodeScanner: Feature disabled");
					}
				},
				// Feature check error
				function () {
					Log.warning("BarcodeScanner: Feature check failed");
				}
			);
		} else {
			Log.warning("BarcodeScanner: Feature vector (sap.Settings.isFeatureEnabled) is not available");
		}
	}

	/**
	 * Makes sure that fallback option with input field appears in case if video device not available
	 * @private
	 * @param {String} sMessage popup will contain label with this explanatory message about reason why scanner is not available
	 */
	function openBarcodeInputDialog(sMessage) {
		if (sMessage) {
			Log.warning("isNoScanner. Message: " + sMessage);
		}
		closeZXingScanContain();

		oScanDialog.destroyContent();
		oScanDialog.setTitle('');
		oScanDialog.setStretch(false);
		oScanDialog.setContentHeight('auto');
		oScanDialog.removeStyleClass('sapUiNoContentPadding');

		oScanDialog.setTitle(oDialogTitle);
		oScanDialog.addContent(
			new Label({
				text: "{i18n>BARCODE_DIALOG_MSG}",
				visible: "{/isNoScanner}"
			})
		);

		var oFallbackInput = new Input({
			value: "{/barcode}",
			valueLiveUpdate: true,
			liveChange: function(oEvent) {
				if (typeof oScanDialogController.onLiveUpdate === "function") {
					oScanDialogController.onLiveUpdate({
						newValue: oEvent.getParameter("newValue")
					});
				}
			},
			placeholder: "{i18n>BARCODE_DIALOG_PLACEHOLDER}"
		});
		oScanDialog.addContent(oFallbackInput);

		oScanDialog.setBeginButton(
			new Button({
				text: "{i18n>BARCODE_DIALOG_OK}",
				press: function(oEvent) {
					BarcodeScanner.closeScanDialog();
					if (typeof oScanDialogController.onSuccess === "function") {
						oScanDialogController.onSuccess({
							text: oScanDialog.getModel().getProperty("/barcode"),
							cancelled: false
						});
					}
				}
			})
		);
		oScanDialog.setEndButton(
			new Button({
				text: "{i18n>BARCODE_DIALOG_CANCEL}",
				press: function() {
					BarcodeScanner.closeScanDialog();
				}
			})
		);

		oScanDialog.setBusy(false);
		oScanDialog.open();
	}


	/**
	 * Initializes ZXing code reader scan, video device gets turned on and starts waiting for barcode
	 * @private
	 */
	function openBarcodeScannerDialog() {
		if (navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices
				.getUserMedia(defaultConstraints)
				.then(
					function(stream) {
						openBarcodeScannerDialogContains();
					}
				)
				.catch(
					function() {
						oScanDialog.getModel().setProperty("/isNoScanner", true);
						openBarcodeInputDialog();
					}
				);
		} else {
			oScanDialog.getModel().setProperty("/isNoScanner", true);
			openBarcodeInputDialog();
		}
	}

	function getScanDialog(fnSuccess, fnFail, fnLiveUpdate, sTitle) {
		var oDialogModel;
		oScanDialogController.onSuccess = fnSuccess;
		oScanDialogController.onFail = fnFail;
		oScanDialogController.onLiveUpdate = fnLiveUpdate;

		if (!oScanDialog || (oScanDialog && oScanDialog.getContent().length === 0)) {
			oDialogModel = new JSONModel();
			oScanDialog = new Dialog({
				icon: 'sap-icon://bar-code',
				title: "",
				stretch: true,
				horizontalScrolling: false,
				verticalScrolling: false,
				endButton: new Button({
					text: "{i18n>BARCODE_DIALOG_CANCEL}",
					enabled: false,
					press: function() {
						closeZXingScanContain();
						oScanDialog.getModel().setProperty("/isNoScanner", false);
						openBarcodeInputDialog();
					}
				}),
				afterClose: function() {
					oScanDialog.destroyContent();
					oScanDialog.destroy();
					oScanDialog = null;
				}
			});
			oScanDialog.setEscapeHandler(function(promise) {
				BarcodeScanner.closeScanDialog();
				if (typeof fnSuccess === "function") {
					fnSuccess({
						text: oDialogModel.getProperty("/barcode"),
						cancelled: true
					});
				}
				promise.resolve();
			});
			oScanDialog.setModel(oDialogModel);
			oScanDialog.setModel(oResourceModel, "i18n");
		}

		if (typeof sTitle === "string" && sTitle != null && sTitle.trim() != "") {
			oDialogTitle = sTitle;
		}


		if (oCordovaScannerAPI || !oStatusModel.getProperty("/available")) {
			oScanDialog.getModel().setProperty("/isNoScanner", false);
			openBarcodeInputDialog();
		} else if (isUserMediaAccessSupported() && oZXingScannerAPI) {
			openBarcodeScannerDialog();
		} else {
			oScanDialog.getModel().setProperty("/isNoScanner", true);
			openBarcodeInputDialog('UserMedia is not available');
		}

		return oScanDialog;
	}

	/**
	 * Opens Barcode Scanner dialog, called when code reader is ready
	 * @private
	 */
	function openBarcodeScannerDialogContains() {
		oScanDialog.attachAfterOpen(
			function() {
				// Dev note: if video element dom reference is not available at this point (console exception)
				// some error happened during dialog creation and may not be directly related to video element
				oScanDialog.getEndButton().setEnabled(true);
				oScanDialog.setBusy(false);

				if (!oBarcodeHighlightDOM) {
					oBarcodeHighlightDOM = oBarcodeScannerUIContainer ? oBarcodeScannerUIContainer.getDomRef('highlight') : undefined;
				}
				if (!oBarcodeVideoDOM) {
					oBarcodeVideoDOM = oBarcodeScannerUIContainer ? oBarcodeScannerUIContainer.getDomRef('video') : undefined;
				}

				oZXingScannerAPI.decodeFromVideoDevice(null, oBarcodeScannerUIContainer.getId() + '-video', function (result, err) {
					oScanFrame();
					if (result) {
						var point, scaleX, scaleY;
						var bottom = 0,
							right = 0,
							top = 0,
							left = 0,
							i;

						if (oBarcodeHighlightDOM && !bBarcodeOverlaySetup) {
							oBarcodeHighlightDOM.innerHTML = '';
							bBarcodeOverlaySetup = true;
						}

						if (oBarcodeHighlightDOM) {
							scaleX = oBarcodeVideoDOM.clientWidth / oBarcodeVideoDOM.videoWidth;
							scaleY = oBarcodeVideoDOM.clientHeight / oBarcodeVideoDOM.videoHeight;
							if (result.resultPoints) {
								top = result.resultPoints[0].y;
								left = result.resultPoints[0].x;
								right = result.resultPoints[0].x;
								bottom = result.resultPoints[0].y;

								for (i = 0; i < result.resultPoints.length; i++) {
									point = result.resultPoints[i];
									if (point.x < left && point.x < right) {
										left = point.x;
									} else if (point.x > left && point.x > right) {
										right = point.x;
									}
									if (point.y < top && point.y < bottom) {
										top = point.y;
									} else if (point.y > top && point.y > bottom) {
										bottom = point.y;
									}
								}
							}

							oBarcodeHighlightDOM.hidden = false;
							oBarcodeHighlightDOM.style.top = top * scaleY + 'px';
							oBarcodeHighlightDOM.style.left = left * scaleX + 'px';
							oBarcodeHighlightDOM.style.width = (right - left > 0 ? (right - left + imgTruncX) * scaleX : 5) + 'px';
							oBarcodeHighlightDOM.style.height = (bottom - top > 0 ? (bottom - top + imgTruncY) * scaleY : 5) + 'px';
						}

						if (result.cancelled === "false" || !result.cancelled) {
							result.cancelled = false;
							if (typeof oScanDialogController.onSuccess === "function") {
								oScanDialogController.onSuccess(result);
							}
							closeZXingScanContain();
							BarcodeScanner.closeScanDialog();
						}
					} else {
						if (oBarcodeHighlightDOM && bBarcodeOverlaySetup) {
							oBarcodeHighlightDOM.hidden = true;
							oBarcodeHighlightDOM.style.top = '0';
							oBarcodeHighlightDOM.style.left = '0';
							oBarcodeHighlightDOM.style.width = '0';
							oBarcodeHighlightDOM.style.height = '0';
						}
					}

					if (err && oZXing && !(err instanceof oZXing.NotFoundException)) {
						Log.warning("Started continous decode failed.");
						if (typeof oScanDialogController.onFail === "function") {
							oScanDialogController.onFail(err);
							openBarcodeInputDialog();
						}
					}
				});
			});
		oScanDialog.destroyContent();
		oBarcodeHighlightDOM = undefined;
		oBarcodeOverlayDOM = undefined;
		oBarcodeVideoDOM = undefined;

		oBarcodeScannerUIContainer = new BarcodeScannerUIContainer();
		oScanDialog.addContent(oBarcodeScannerUIContainer);

		oScanDialog.setContentWidth('100%');
		oScanDialog.setContentHeight('100%');
		oScanDialog.addStyleClass('sapUiNoContentPadding');
		oScanDialog.setBusy(true);
		oScanDialog.open();

		bBarcodeOverlaySetup = false;
	}

	function oScanFrame() {
		var iInactiveZonePercent = 0.15;
		if (!oBarcodeVideoDOM || !oBarcodeVideoDOM.videoHeight || !oBarcodeVideoDOM.videoWidth) {
			return;
		}

		if (!oBarcodeOverlayDOM && oBarcodeScannerUIContainer) {
			oBarcodeOverlayDOM = oBarcodeScannerUIContainer.getDomRef('overlay');
		}

		if (oBarcodeOverlayDOM) {
			var oBarcodeOverlayWidthTemp = oBarcodeVideoDOM.clientWidth * (1 - 2 * iInactiveZonePercent);
			var oBarcodeOverlayHeightTemp = oBarcodeVideoDOM.clientHeight * (1 - 2 * iInactiveZonePercent);

			if (oBarcodeOverlayWidthTemp <= oBarcodeOverlayHeightTemp) {
				oBarcodeOverlayHeightTemp = oBarcodeOverlayWidthTemp * (1 - 2 * iInactiveZonePercent);
			}

			// Base on the size of vidoe Dom, reset the size of barcode scanner box
			var oBarcodeScannerBox = oBarcodeScannerUIContainer.getDomRef('overlay-box');
			oBarcodeScannerBox.style.width = oBarcodeOverlayWidthTemp + 'px';
			oBarcodeScannerBox.style.height = oBarcodeOverlayHeightTemp + 'px';

			oBarcodeOverlayDOM.style.width = oBarcodeOverlayWidthTemp + 'px';
			oBarcodeOverlayDOM.style.height = oBarcodeOverlayHeightTemp + 'px';
			oBarcodeOverlayDOM.style.borderWidth = (oBarcodeVideoDOM.clientHeight - oBarcodeOverlayHeightTemp) / 2 + 'px ' + (oBarcodeVideoDOM.clientWidth - oBarcodeOverlayWidthTemp) / 2 + 'px';
		}
	}

	function closeZXingScanContain() {
		if (oZXingScannerAPI) {
			oZXingScannerAPI.reset();
			oZXingScannerAPI.stopContinuousDecode();
		}
	}

	/* =========================================================== */
	/* API methods												 */
	/* =========================================================== */

	/**
	 * Starts the bar code scanning process either showing the live input from the camera or displaying a dialog
	 * to enter the value directly if the bar code scanning feature is not available.
	 *
	 * <pre>
	 * sap.ndc.BarcodeScanner.scan(fnSuccess, fnFail, fnLiveUpdate, dialogTitle)
	 * </pre>
	 *
	 * The bar code scanning is done asynchronously. When it is triggered, this function returns without waiting for
	 * the scanning process to finish. The applications have to provide callback functions to react to the events of
	 * a successful scanning, an error during scanning, and the live input on the dialog.
	 *
	 * <code>fnSuccess</code> is passed an object with text, format and cancelled properties. Text is the text representation
	 * of the bar code data, format is the type of the bar code detected, and cancelled is whether or not the user cancelled
	 * the scan. <code>fnError</code> is given the error, <code>fnLiveUpdate</code> is passed the new value entered in the
	 * dialog's input field. An example:
	 *
	 * <pre>
	 * sap.ndc.BarcodeScanner.scan(
	 *	function (mResult) {
	 *	   alert("We got a bar code\n" +
	 *			 "Result: " + mResult.text + "\n" +
	 *			 "Format: " + mResult.format + "\n" +
	 *			 "Cancelled: " + mResult.cancelled);
	 *	},
	 *	function (Error) {
	 *	   alert("Scanning failed: " + Error);
	 *	},
	 *	function (mParams) {
	 *	   alert("Value entered: " + mParams.newValue);
	 *	},
	 *	"Enter Product Bar Code"
	 * );
	 * </pre>
	 *
	 * @param {function} [fnSuccess] Function to be called when the scanning is done or cancelled
	 * @param {function} [fnFail] Function to be called when the scanning is failed
	 * @param {function} [fnLiveUpdate] Function to be called when value of the dialog's input is changed
	 * @param {string} [dialogTitle] Defines the bar code input dialog title. If unset, a predefined title will be used.
	 *
	 * @public
	 * @static
	 */
	BarcodeScanner.scan = function (fnSuccess, fnFail, fnLiveUpdate, dialogTitle) {
		if (!bReady) {
			Log.error("Barcode scanning is already in progress.");
			return;
		}

		bReady = false;

		if (oStatusModel.getProperty("/available") == true && oCordovaScannerAPI == null && oZXingScannerAPI == null){
			//in case we do not have feature vectore we still would like to allow the use
			//of native device capability.
			getFeatureAPI();
		}

		if (oCordovaScannerAPI) {
			oCordovaScannerAPI.scan(
				function (oResult) {
					if (oResult.cancelled === "false" || !oResult.cancelled) {
						oResult.cancelled = false;
						if (typeof fnSuccess === "function") {
							fnSuccess(oResult);
						}
					} else {
						getScanDialog(fnSuccess, fnFail, fnLiveUpdate, dialogTitle);
					}
					bReady = true;
				},
				function (oEvent) {
					Log.error("Barcode scanning failed.");
					if (typeof fnFail === "function") {
						fnFail(oEvent);
					}
					bReady = true;
				}
			);
		} else {
			getScanDialog(fnSuccess, fnFail, fnLiveUpdate, dialogTitle);
		}
	};

	/**
	 * Closes the bar code input dialog. It can be used to close the dialog before the user presses the OK or the Cancel button
	 * (e.g. in the fnLiveUpdate callback function of the {@link sap.ndc.BarcodeScanner.scan} method.)
	 *
	 * @public
	 * @static
	 */
	BarcodeScanner.closeScanDialog = function () {
		if (oScanDialog) {
			oScanDialog.close();
			bReady = true;
		}
	};

	/**
	 * Returns the status model of the BarcodeScanner. It is a JSON model which contains a single boolean property
	 * '<code>available</code>' indicating whether or not the bar code scanner feature is available. It can be used
	 * to bind to the <code>visible</code> property of UI controls which have to be hidden in case the feature is unavailable.
	 *
	 * @returns {sap.ui.model.json.JSONModel} A JSON model containing the 'available' property
	 * @public
	 * @static
	 */
	BarcodeScanner.getStatusModel = function () {
		return oStatusModel;
	};
	init();	//must be called to enable control if no feature vector is available.
	return BarcodeScanner;

}, /* bExport= */ true);