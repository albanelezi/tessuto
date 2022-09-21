sap.ui.define([
	"../util/ms_BarcodeScanner",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/MessageToast'
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (BarcodeScanner, Controller, MessageBox, JSONModel, Fragment, Filter, FilterOperator, MessageToast) {
		"use strict";

		return Controller.extend("traccibilitanmp.traccibilitatesutto.controller.HomePage", {

			onInit: function () {

				const oModel = new JSONModel({
					busy: false
				});
				this.getView().setModel(oModel, "viewModel");
				// this.setFocus("field1");
				jQuery.sap.delayedCall(500, this, function () {
					this.byId("field1").focus();
				});
			},

			//set cursor focus on the field
			setFocus: function (iId) {
				var oId;

				//set the next id in line
				if (iId === "field1") {
					oId = "field3"
				} else if (iId === "field3") {
					oId = "field4"
				} else {
					return;
				}

				jQuery.sap.delayedCall(500, this, function () {
					this.byId(oId).focus();
				});
			},

			onSavePress: function () {
				const oField1 = this.checkFieldSplit(this.byId("field2").getValue());//this.byId("workCenterId").getSelectedKey();
				const oField2 = this.checkFieldSplit(this.byId("field3").getValue());//this.byId("materialId").getSelectedKey();
				const oField3 = this.byId("field4").getValue();//this.byId("partitaId").getValue();
				const oField4 = this.checkFieldSplit(this.byId("field1").getValue());//this.byId("orderId").getSelectedKey();
				const oWarn = this._geti18n("mandatory");
				const oWarnNotEq = this._geti18n("notEqual");
				const oCancelConfirm = this._geti18n("confirm");
				const that = this;

				if (oField1 === "" || oField2 === "" || oField3 === "" || oField4 === "") {
					MessageBox.warning(oWarn);
				} else {
					//extra control, we check if the first character of field partita are equal to field tessuto
					const partitaLength = oField2.length;
					const oCheckFiled = oField3.substring(0, partitaLength).toUpperCase();

					// if (oCheckFiled == oField2.toUpperCase()) {
						MessageBox.confirm(oCancelConfirm, {
							actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
							onClose: function (sAction) {
								if (sAction === 'OK') {
									that.onMatnrChange(oField1, oField2, oField3, oField4, that);
								}
							}
						});
					// } else {
					// 	MessageBox.warning(oWarnNotEq);
					// }

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

			callCreate: function (Field1, Field2, Field3, oField4) {
				const that = this;
				const oModel = this.getView().getModel();
				const oViewModel = this.getView().getModel("viewModel");
				let oItem = {};
				oItem.Arbpl = Field1;
				oItem.Matnr = Field2;
				oItem.Partita = Field3;
				oItem.Aufnr = oField4;

				oViewModel.setProperty('/busy', true);
				oModel.create("/TracciaTessutoSet", oItem, {
					success: function (oData) {
						oViewModel.setProperty('/busy', false);

						if (oData.Rcode == '0') {
							MessageBox.success(oData.Message);
							that._clearFields();
						} else {
							MessageBox.error(oData.Message);
						}

					},
					error: function (Error) { //In case of error show pop up and navigate back to the view
						oViewModel.setProperty('/busy', false);
						MessageBox.error(Error.message);
					}
				});
			},

			// Event when user change data in inputs fields ---------------------------------------
			onInputChange: function () {
				this._showFooter();
			},

			// Event when user change data in Material input ---------------------------------------
			onMatnrChange: function (oField1, oField2, oField3, oField4, that) {
				const oModel = this.getView().getModel();
				const oViewModel = this.getView().getModel("viewModel");
				const oMatnr = this.checkFieldSplit(this.byId("field3").getValue());//this.byId("materialId").getSelectedKey();
				const oAufnr = this.checkFieldSplit(this.byId("field1").getValue());//this.byId("orderId").getSelectedKey();

				if (!oAufnr) {
					MessageBox.warning(this.getView().getModel("i18n").getResourceBundle().getText("no_aufnr"));
				} else {
					const oFilter = [new Filter("MATNR", "EQ", oMatnr),
					new Filter("AUFNR", "EQ", oAufnr)];

					oViewModel.setProperty('/busy', true);
					oModel.read("/Check_Matnr_to_OdPSet", {
						filters: oFilter,
						success: function (oData) {
							oViewModel.setProperty('/busy', false);
							if (oData.results[0].RCODE == '2') {
								that.callCreate(oField1, oField2, oField3, oField4);
							} else {
								MessageBox.warning(oData.results[0].MESSAGE, {
									actions: ["SI", 'NO'],
									emphasizedAction: "SI",
									onClose: function (sAction) {
										if (sAction == "SI") {
											that.callCreate(oField1, oField2, oField3, oField4);
										} else {
											that.byId("field3").focus();
										}
									}
								});
							}

						},
						error: function (Error) {
							oViewModel.setProperty('/busy', false);
							MessageBox.error(Error.message);
						}
					});
				}

				this._showFooter();
			},

			// -------------- Events for Order / Ordine ---------------------------
			onOrderChange: function () {
				this.byId("field3").setValue("");
				this.byId("field3").setSelectedKey("");

				//Call the service to fill the work center
				this.fillWorkCenterMaterial();
			},

			orderValueHelpRequest: function (oEvent) {
				const that = this;
				const oView = this.getView();
				const sInputValue = oEvent.getSource().getValue();

				that.getView().getModel().read("/OrdineProduzioneSet", {
					success: function (oData) {
						that.getView().setModel(new JSONModel(oData.results), "order");

						if (!that._pValueHelporderDialog) {
							that._pValueHelporderDialog = Fragment.load({
								id: oView.getId(),
								name: "traccibilitanmp.traccibilitatesutto.fragments.order",
								controller: that
							}).then(function (oDialog) {
								oView.addDependent(oDialog);
								return oDialog;
							});
						}
						that._pValueHelporderDialog.then(function (oDialog) {
							// Create a filter for the binding
							oDialog.getBinding("items").filter([
								new Filter("AUFNR", FilterOperator.Contains, sInputValue)
							]);
							// Open ValueHelpDialog filtered by the input's value
							oDialog.open(sInputValue);
						});

					},
					error: function (err) {
						console.log(err);
					}
				});
			},

			onValueHelpOrderSearch: function (oEvent) {
				const sValue = oEvent.getParameter("value");
				const oFilter = new Filter("AUFNR", FilterOperator.Contains, sValue);

				oEvent.getSource().getBinding("items").filter([oFilter]);
			},

			onValueHelpOrderClose: function (oEvent) {
				const oSelectedItem = oEvent.getParameter("selectedItem");
				oEvent.getSource().getBinding("items").filter([]);

				if (!oSelectedItem) return;

				const test = `${oSelectedItem.getTitle()} - ${oSelectedItem.getDescription()}`;
				// Set selected key values to input field------------------------------------------
				// this.byId("orderId").setValue(`${oSelectedItem.getTitle()} - ${oSelectedItem.getDescription()}`);
				this.byId("field1").setValue(test);
				// this.byId("orderId").setSelectedKey(oSelectedItem.getTitle());

				// Display footer to user ---------------------------------------------------------
				this._showFooter();
				this.onOrderChange();

				this.setFocus("field1");
			},

			// -------------- Events for Work center / Centro di lavoro ---------------------------
			workCenterValueHelpRequest: function (oEvent) {
				const that = this;
				const oView = this.getView();
				const sInputValue = oEvent.getSource().getValue();

				that.getView().getModel().read("/Centro_di_lavoroSet", {
					success: function (oData) {
						that.getView().setModel(new JSONModel(oData.results), "workCenter");

						if (!that._pValueHelpworkCenterDialog) {
							that._pValueHelpworkCenterDialog = Fragment.load({
								id: oView.getId(),
								name: "traccibilitanmp.traccibilitatesutto.fragments.workCenter",
								controller: that
							}).then(function (oDialog) {
								oView.addDependent(oDialog);
								return oDialog;
							});
						}
						that._pValueHelpworkCenterDialog.then(function (oDialog) {
							// Create a filter for the binding
							oDialog.getBinding("items").filter([
								new Filter("ARBPL", FilterOperator.Contains, sInputValue)
							]);
							// Open ValueHelpDialog filtered by the input's value
							oDialog.open(sInputValue);
						});

					},
					error: function (err) {
						console.log(err);
					}
				});
			},

			onValueHelpWorkCenterSearch: function (oEvent) {
				const sValue = oEvent.getParameter("value");
				const oFilter = new Filter("ARBPL", FilterOperator.Contains, sValue);

				oEvent.getSource().getBinding("items").filter([oFilter]);
			},

			onValueHelpWorkCenterClose: function (oEvent) {
				const oSelectedItem = oEvent.getParameter("selectedItem");
				oEvent.getSource().getBinding("items").filter([]);

				if (!oSelectedItem) return;

				// Set selected key values to input field------------------------------------------
				this.byId("field2").setValue(`${oSelectedItem.getTitle()} - ${oSelectedItem.getDescription()}`);
				// this.byId("workCenterId").setSelectedKey(oSelectedItem.getTitle());

				// Display footer to user ---------------------------------------------------------
				this._showFooter();

				this.setFocus("field2");
			},

			// -------------- Events for Tessuto --------------------------------------------------
			tessutoValueHelpRequest: function (oEvent) {
				const that = this;
				const oView = this.getView();
				const sInputValue = oEvent.getSource().getValue();

				that.getView().getModel().read("/TessutoSet", {
					success: function (oData) {
						that.getView().setModel(new JSONModel(oData.results), "tessuto");

						if (!that._pValueHelptessutoDialog) {
							that._pValueHelptessutoDialog = Fragment.load({
								id: oView.getId(),
								name: "traccibilitanmp.traccibilitatesutto.fragments.tessuto",
								controller: that
							}).then(function (oDialog) {
								oView.addDependent(oDialog);
								return oDialog;
							});
						}
						that._pValueHelptessutoDialog.then(function (oDialog) {
							// Create a filter for the binding
							oDialog.getBinding("items").filter([
								new Filter("MATNR", FilterOperator.Contains, sInputValue)
							]);
							// Open ValueHelpDialog filtered by the input's value
							oDialog.open(sInputValue);
						});

					},
					error: function (err) {
						console.log(err);
					}
				});

			},

			onValueHelptessutoSearch: function (oEvent) {
				const sValue = oEvent.getParameter("value");
				const oFilter = new Filter("MATNR", FilterOperator.Contains, sValue);

				oEvent.getSource().getBinding("items").filter([oFilter]);
			},

			onValueHelptessutoClose: function (oEvent) {
				const oSelectedItem = oEvent.getParameter("selectedItem");
				oEvent.getSource().getBinding("items").filter([]);

				if (!oSelectedItem) return;

				console.log(oSelectedItem);

				// Set selected key values to input field------------------------------------------
				this.byId("field3").setValue(`${oSelectedItem.getTitle()} - ${oSelectedItem.getDescription()}`);
				// this.byId("materialId").setSelectedKey(oSelectedItem.getTitle());


				// Display footer to user ---------------------------------------------------------
				this._showFooter();

				this.setFocus("field3");
				// this.onMatnrChange();
			},

			// --------------- Events for QR code scaner / Partitao -------------------------------
			// onScanSuccess: function (oEvent) {
			// 	if (oEvent.getParameter("cancelled")) {
			// 		MessageBox.warning("Scan cancelled");
			// 	} else {
			// 		if (oEvent.getParameter("text")) {
			// 			// Save value to Partita input field --------------------------------------
			// 			this.byId("partitaId").setValue(oEvent.getParameter("text"));
			// 			// Display footer to user -------------------------------------------------
			// 			this._showFooter();
			// 		} else {
			// 			this.byId("partitaId").setValue('');
			// 		}
			// 	}
			// },

			// onScanError: function (oEvent) {
			// 	MessageBox.error(`Scan failed: ${oEvent}`);
			// },

			// onScanLiveupdate: function (oEvent) {
			// 	// User can implement the validation about inputting value
			// },


			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Internal functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

			// Clear Input Fields  ----------------------------------------------------------------
			_clearFields: function () {

				this.byId("field1").setValue("");
				this.byId("field1").setSelectedKey("");

				this.byId("field2").setValue("");
				this.byId("field2").setSelectedKey("");

				this.byId("field3").setValue("");
				this.byId("field3").setSelectedKey("");

				this.byId("field4").setValue("");

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

			//Call the barcode for the production number
			onBtnScanPress: function (oEvent) {
				let oId = oEvent.getSource().getId().substring(oEvent.getSource().getId().length - 6);//Get the last characters of ID
				BarcodeScanner.scan(
					function (oResult) { /* process scan result */
						this.onSubmit(true, oResult.text, oId);

						//if all the field are valorized save the record
						const oField1 = this.checkFieldSplit(this.byId("field2").getValue());//this.byId("workCenterId").getSelectedKey();
						const oField2 = this.checkFieldSplit(this.byId("field3").getValue());//this.byId("materialId").getSelectedKey();
						const oField3 = this.byId("field4").getValue();//this.byId("partitaId").getValue();
						const oField4 = this.checkFieldSplit(this.byId("field1").getValue());//this.byId("orderId").getSelectedKey();

						if (oField1 !== "" && oField2 !== "" && oField3 !== "" && oField4 !== "") {
							this.onSavePress();
						}
					}.bind(this),
					function (oError) {
						console.log(oError);
					}
				);
			},

			onSubmit: function (barcode, scanInput, sId) {
				var sInput;
				if (barcode === true) {
					sInput = scanInput;
				} else {
					sInput = this.getView().byId(sId).getValue();
				}
				if (sInput === "") {
					return;
				}
				var oBarcode = this.splitBarcode(sInput);
				if (oBarcode === null) {
					var msg = "Ungültiger Barcode: " + sInput;
					this.showMessageErrorDialog(msg);
					this.getView().byId(sId).setValue("");
					return;
				} else {
					this.getView().byId(sId).setValue(sInput);
				}
				this.setFocus(sId);
			},

			splitBarcode: function (input) {
				var arr = input.split(";");
				var barcode = {
					matnr: arr[1],
					lgort: arr[2]
				};
				if (barcode.matnr === undefined) {
					barcode.matnr = "";
				}
				if (barcode.lgort === undefined) {
					barcode.lgort = "";
				}
				return barcode;
			},

			checkFieldSplit: function (iValue) {
				if (iValue.includes("-")) {
					return iValue.split("-")[0].trim();
				} else {
					return iValue;
				}
			},

			//Method that get the value of cost center based on the order
			fillWorkCenterMaterial: function () {
				const oModel = this.getView().getModel();
				const oViewModel = this.getView().getModel("viewModel");
				const oAufnr = this.checkFieldSplit(this.byId("field1").getValue());//this.byId("orderId").getSelectedKey();
				const oFilter = new Filter("AUFNR", "EQ", oAufnr);
				const that = this;

				oViewModel.setProperty('/busy', true);
				oModel.read("/Get_arbplSet", {
					filters: [oFilter],
					success: function (oData) {
						oViewModel.setProperty('/busy', false);
						if (oData.results.length > 0) {
							that.getView().byId("field2").setValue(oData.results[0].ARBPL);//Work Center
							that.getView().byId("field3").setValue(oData.results[0].MATNR);//Work Center

							that.setFocus("field3");//set the focus to the last field
						} else {
							MessageBox.error("Non esiste Centro di lavoro che corrisponde al ordine selezionato");
							that.getView().byId("field2").setValue("");//Work Center
							that.getView().byId("field3").setValue("");//Work Center
						}
					},
					error: function (Error) {
						oViewModel.setProperty('/busy', false);
						MessageBox.error(Error.message);
					}
				});
			}

		});
	});
