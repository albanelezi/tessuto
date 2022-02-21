/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"traccibilita_nmp/traccibilita_tesutto/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
