sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, MessageBox, JSONModel, Fragment, Filter, FilterOperator) {
		"use strict";

		return Controller.extend("traccibilitanmp.traccibilitatesutto.controller.HomePage", {
			onInit: function () {

				// Test data for Work center ------------------------------------------------------
				const oPath = "traccibilitanmp/traccibilitatesutto/jsonData/workCenter.json";
				const oModel = new JSONModel(sap.ui.require.toUrl(oPath));
				this.getView().setModel(oModel, "workCenter");

				// Just for test.Display app in italian language by default------------------------ 
				sap.ui.getCore().getConfiguration().setLanguage("it");
			},

			onSavePress: function () {
				const oField1 = this.byId("workCenterId").getSelectedKey();
				const oField2 = this.byId("materialId").getValue();
				const oField3 = this.byId("partitaId").getValue();
				const oWarn = this._geti18n("mandatory");
				const oWarnNotEq = this._geti18n("notEqual");

				if (oField1 === "" || oField2 === "" || oField3 === "") {
					MessageBox.warning(oWarn);
				} else {
					//extra control, we check if the first character of field partita are equal to field tessuto
					var partitaLength = oField2.length;

					if (oField3.substring(0, partitaLength) == oField2) {
						MessageBox.success(`I valori inseriti sono => Centro di lavoro:${oField1} / Tessuto:${oField2} / Partita:${oField3}`);
					} else {
						MessageBox.warning(oWarnNotEq);
					}

				}
			},

			onCancelPress: function () {
				const that = this;
				const oPage = this.byId("dynamicPageId");
				const oCancelConfirm = that._geti18n("cancelConfirm");

				MessageBox.warning(oCancelConfirm, {
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					onClose: function (sAction) {
						if (sAction === 'OK') {
							oPage.setShowFooter(false);
							that._clearFields();
						}
					}
				});
			},

			// Event when user change data in inputs fields ---------------------------------------
			onInputChange: function () {
				this._showFooter();
			},

			// -------------- Events for Work center / Centro di lavoro ---------------------------
			workCenterValueHelpRequest: function (oEvent) {
				const oView = this.getView();
				const sInputValue = oEvent.getSource().getValue();

				if (!this._pValueHelpworkCenterDialog) {
					this._pValueHelpworkCenterDialog = Fragment.load({
						id: oView.getId(),
						name: "traccibilitanmp.traccibilitatesutto.fragments.workCenter",
						controller: this
					}).then(function (oDialog) {
						oView.addDependent(oDialog);
						return oDialog;
					});
				}
				this._pValueHelpworkCenterDialog.then(function (oDialog) {
					// Create a filter for the binding
					oDialog.getBinding("items").filter([
						new Filter("Descr", FilterOperator.Contains, sInputValue)
					]);
					// Open ValueHelpDialog filtered by the input's value
					oDialog.open(sInputValue);
				});
			},

			onValueHelpWorkCenterSearch: function (oEvent) {
				const sValue = oEvent.getParameter("value");
				const oFilter = new Filter("Descr", FilterOperator.Contains, sValue);

				oEvent.getSource().getBinding("items").filter([oFilter]);
			},

			onValueHelpWorkCenterClose: function (oEvent) {
				const oSelectedItem = oEvent.getParameter("selectedItem");
				oEvent.getSource().getBinding("items").filter([]);

				if (!oSelectedItem) return;

				// Set selected key values to input field------------------------------------------
				this.byId("workCenterId").setValue(oSelectedItem.getDescription());
				this.byId("workCenterId").setSelectedKey(oSelectedItem.getTitle());

				// Display footer to user ---------------------------------------------------------
				this._showFooter();
			},

			// -------------- Events for Tessuto --------------------------------------------------
			tessutoValueHelpRequest: function (oEvent) {
				const oView = this.getView();
				const sInputValue = oEvent.getSource().getValue();

				if (!this._pValueHelptessutoDialog) {
					this._pValueHelptessutoDialog = Fragment.load({
						id: oView.getId(),
						name: "traccibilitanmp.traccibilitatesutto.fragments.tessuto",
						controller: this
					}).then(function (oDialog) {
						oView.addDependent(oDialog);
						return oDialog;
					});
				}
				this._pValueHelptessutoDialog.then(function (oDialog) {
					// Create a filter for the binding
					oDialog.getBinding("items").filter([
						new Filter("Descr", FilterOperator.Contains, sInputValue)
					]);
					// Open ValueHelpDialog filtered by the input's value
					oDialog.open(sInputValue);
				});
			},

			onValueHelptessutoSearch: function (oEvent) {
				const sValue = oEvent.getParameter("value");
				const oFilter = new Filter("Descr", FilterOperator.Contains, sValue);

				oEvent.getSource().getBinding("items").filter([oFilter]);
			},

			onValueHelptessutoClose: function (oEvent) {
				const oSelectedItem = oEvent.getParameter("selectedItem");
				oEvent.getSource().getBinding("items").filter([]);

				if (!oSelectedItem) return;

				// Set selected key values to input field------------------------------------------
				this.byId("materialId").setValue(oSelectedItem.getDescription());
				this.byId("materialId").setSelectedKey(oSelectedItem.getTitle());

				
				// Display footer to user ---------------------------------------------------------
				this._showFooter();
			},

			// --------------- Events for QR code scaner / Partitao -------------------------------
			onScanSuccess: function (oEvent) {
				if (oEvent.getParameter("cancelled")) {
					MessageBox.warning("Scan cancelled");
				} else {
					if (oEvent.getParameter("text")) {
						// Save value to Partita input field ----------------------------------------------
						this.byId("partitaId").setValue(oEvent.getParameter("text"));
						// Display footer to user ---------------------------------------------------------
						this._showFooter();
					} else {
						this.byId("partitaId").setValue('');
					}
				}
			},

			onScanError: function (oEvent) {
				MessageBox.error(`Scan failed: ${oEvent}`);
			},

			onScanLiveupdate: function (oEvent) {
				// User can implement the validation about inputting value
			},


			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Internal functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

			// Clear Input Fields  ----------------------------------------------------------------
			_clearFields: function () {
				this.byId("workCenterId").setValue("");
				this.byId("materialId").setValue("");
				this.byId("partitaId").setValue("");
			},

			// Show footer ------------------------------------------------------------------------
			_showFooter: function () {
				const oPage = this.byId("dynamicPageId");
				if (!oPage.getShowFooter()) {
					oPage.setShowFooter(true);
				}
			},

			// Get text translations from i18n ----------------------------------------------------
			_geti18n: function (textName) {
				return this.getView().getModel("i18n").getResourceBundle().getText(textName);
			},

		});
	});
