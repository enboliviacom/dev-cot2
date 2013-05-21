var deviceIsOnLine = false;
//var urlWebService = "http://www.cuencasbolivia.org/gapi/dataCotizador.json";
var urlWebService = "http://www.cuencasbolivia.org/gapi/dataPrincesa.json";
var db;
var parsedData;
var dbName = "cotizador";
var dbDescription = "Cotizador";
var dbVersion = "1.0";
var dbSizeMB = 7;
var tablePackages = "categorias";
var tablePackagesExists = false;
var tableModules = "productos";
var tableModulesExists = false;
var tableOrdersExists = false;
var tableClientsExists = false;

function onLoad() {
	/*$.mobile.allowCrossDomainPages = true;
    $.support.cors = true;*/
    
	document.addEventListener( "deviceready", onDeviceReady, false );
	document.addEventListener( "online", onOnline, false );
	document.addEventListener( "offline", onOffline, false );
}

$( document ).bind( 'mobileinit', function(){
	$.mobile.allowCrossDomainPages = true;
	$.support.cors = true;
    
	console.log("-->jquery loaded");
    
	$.mobile.defaultPageTransition = 'none';
	$.mobile.loader.prototype.options.text = "loading";
	$.mobile.loader.prototype.options.textVisible = false;
	$.mobile.loader.prototype.options.theme = "a";
	$.mobile.loader.prototype.options.html = "";
	$.mobile.fixedToolbars.setTouchToggleEnabled(false);
	$.mobile.defaultPageTransition="none";
	
	$.mobile.loading( 'show', {
		text: 'loading...',
		textVisible: true,
		theme: 'a',
		html: ""
		} );
});


$('#mainPage').live('pagecreate', function (event) {
	console.log("-->desabilitando toolbars");
    $.fixedToolbars.setTouchToggleEnabled(false);
});


/**
 * Event listener called after the phonegap library is loaded
 */
function onDeviceReady() {
	/*var elem = document.getElementById("content");
	navigator.notification.alert( "The device is ready", function(){}, jsTitle, "Dale OK" );*/
	
	initializeDB();
	checkCotizadorData();
	$("[data-role=footer]").fixedtoolbar({ tapToggle: false });
	$("[data-role=header]").fixedtoolbar({ tapToggle: false });

	console.log( "packages " + generatePackages + " -- detail " + generateDetail );
	if( generatePackages ) {
		getPackages();	
	}
	else if( generateDetail ) {
		var title = getLocalValue( 'title' );
		var cost = getLocalValue( 'cost' );
		var time = getLocalValue( 'time' );

		$( '#title_detail' ).html( title );
		$( "#packages" ).trigger( "refresh" );
		
		var modules = getLocalValue( 'modules' );
		getModules( modules );
	}
	else if( contactPage ) {
		if( !deviceIsOnLine ) {
			navigator.notification.alert( "Su dispositivo no tiene conexi\u00f3n a Internet, por favor intente m\u00e1s adelante.", function() {
				window.location.href="paquetes.html";
			}, "Formulario de contactos", "Aceptar" );
		}
		else {
			fillClients();
		}
	}
	else if( generateCompraLista ) {
		getListaCompra();
	}
	
	$(document).on("vclick", ".order_button", function(e) {
		console.log(e);
		
		if( $(this).attr("id") == 'lista_pedido' ) {
			window.location.href = "compra_lista.html";
		}
		else {
			console.log("el id de vclick " + $(this).attr("id"));
			var cId = $(this).attr("id");
			
			//--$(this).click();
			changeValues('custom_value_' + cId,cId);
		}
	});
}


/**
 * Event listener called when the device has Internet connection
 */
function onOnline() {
	deviceIsOnLine = true;
}

/**
 * Event listener called when the device has not Internet connection
 */
function onOffline() {
	deviceIsOnLine = false;
}

/**
 * Function to connect whit SQLite database
 */
function initializeDB() {
	db = window.openDatabase( dbName, dbDescription, dbVersion, dbSizeMB * 1024 * 1024 );
}

/**
 * Function to check if there is new data to loaded in local database
 */
function checkCotizadorData() {
	console.log("el valor de base de datos " + window.localStorage.getItem( "database_loaded" ));
	if( window.localStorage.getItem( "database_loaded" ) != "1" ) {
		db.transaction( createOrderTable, errorCB, successCB );
		
		$.ajax({
			url: urlWebService,
			dataType: 'json',
			success: parseAndSaveData,
			error: function(request, status, error) {
			      	console.log("Error status " + status);
			      	console.log("Error request status text: " + request.statusText);
			      	console.log("Error request status: " + request.status);
			      	console.log("Error request response text: " + request.responseText);
			      	console.log("Error response header: " + request.getAllResponseHeaders());
			    	}
		});
	}
	else {
		$( '#preloader' ).hide();
	}
}

/**
 * Function to parse JSON format and save it into a database table
 * @param data, string-json
 */
function parseAndSaveData( data ) {
	parsedData = eval( '(' + JSON.stringify( data ) + ')' );
	console.log("se recibio los datos");
	db.transaction( checkCurrentTables, errorCB, function() {
		console.log( "table[" + tablePackages + "] created: " + tablePackagesExists );
		if( !tablePackagesExists ) {
			db.transaction( createPackageTable, errorCB, successCB );
			db.transaction( insertPackages, errorCB, successCB );
		}
		
		console.log( "table[" + tableModules + "] created: " + tableModulesExists );
		if( !tableModulesExists ) {
			db.transaction( createModuleTable, errorCB, successCB );
			db.transaction( insertModules, errorCB, successCB );
		}
		console.log( "table[clients] created: " + tableClientsExists );
		if( !tableClientsExists ) {
			db.transaction( createClientsTable, errorCB, successCB );
			db.transaction( insertClients, errorCB, successCB );
		}
	
		
		window.localStorage.setItem( "database_loaded", "1" );
		
		$( '#preloader' ).hide();
	} );
}

/**
 * Function to insert record form modules into local database
 * this function use the global variable 'parsedData'
 * @param tx SQLTransaction object
 */
function insertModules( tx ) {
	var query = "";
	var localData = parsedData.products;
	
	console.log( "Inserting data into " + tableModules + " table." );
	for( var i = 0; i < localData.length; i++ ) {
		query = "INSERT INTO " + tableModules + "(name, description, category, cost, quantity, image) VALUES(?,?,?,?,?,?)";
		//--console.log( "query: " + query );
		tx.executeSql( query, [localData[i].name, localData[i].decription, localData[i].category, localData[i].cost, 
		                       localData[i].quantity, localData[i].image],
				function(){}, errorCB );
	}
}

/**
 * Function to insert records into local database
 * this function use the global variable 'parsedData'
 * @param tx
 */
function insertPackages( tx ) {
	var query = "";
	var localData = parsedData.categories;
	
	console.log( "Inserting data into " + tablePackages + " table." );
	for( var i = 0; i < localData.length; i++ ) {
		query = "INSERT INTO " + tablePackages + "(id_mod, name, description, image) VALUES(?,?,?,?)";
		tx.executeSql( query, [localData[i].id_mod, localData[i].name, localData[i].description, localData[i].image],
				function(){}, errorCB );
	}
}

function insertClients( tx ) {
	var query = "";
	var localData = parsedData.clients;
	
	console.log( "Inserting data into clients table. i: " + localData.length );
	for( var i = 0; i < localData.length; i++ ) {
		console.log("Inserting clients");
		query = "INSERT INTO clients(id_mod, name, branch) VALUES(?,?,?)";
		tx.executeSql( query, [localData[i].id, localData[i].name, localData[i].sucursal],
				function(){}, errorCB );
	}
}

function getItemCost( id_elem ) {
	return $( "#" + id_elem ).html();
}

function getItemPrice( id_elem ) {
	return $( "#" + id_elem ).html();
}

function getListaCompra() {
	var htmlContent = '';
	var elementos = new Array();
	
	db.transaction( function(tx) {
		tx.executeSql('SELECT * FROM orders', [], function(tx, results) {
			
			$("#productos_listado").html( "" );
			
			var len = results.rows.length;
			console.log("orders list " + len);
			for (var i=0; i<len; i++){
				elementos[i] = new Array();
	            elementos[i][0] = results.rows.item(i).name;
	            elementos[i][1] = results.rows.item(i).cost;
	            elementos[i][2] = results.rows.item(i).cant;
	            
	            htmlContent += '<li data-icon="false">';
	            htmlContent += '<a href="#" onclick="gotoDetail(' + results.rows.item(i).id_mod + ')">' + results.rows.item(i).name;
	            htmlContent += ' <span class="ui-li-count ui-btn-up-b ui-btn-corner-all">' + results.rows.item(i).cant + '</span>';
	    		htmlContent += '</a>';
	    		htmlContent += '</li>';
	        }
			
			$("#productos_listado").html( $("#productos_listado" ).html() + htmlContent );
			$("#productos_listado").listview("refresh");
			
		}, errorCB);
	}, errorCB, successCB);
}

function gotoDetail( id ) {
	setLocalValue( "search_id", id );
	window.location.href = "paquetes_detalle.html";
}

function search_f() {
	console.log("searching...");
	setLocalValue( "search_word", $("#search_word").val() );
}

/**
 * Function to return modules from DB
 */
function getModules( category ) {
	var query = "";
	
	initializeDB();
	
	db.transaction( function( tx ){
		var htmlContent = '';
		$( "#general_form" ).html( "" );
		$( "#general_form" ).trigger( "refresh" );
		
		var lsearch = getLocalValue( "search_word" );
		var lsearchId = getLocalValue( "search_id" );
		
		if(lsearch.length > 0) {
			query = "SELECT * FROM " + tableModules + " WHERE name LIKE '%" + lsearch + "%'";
			window.localStorage.setItem( "search_word", "" );
		}
		else if( lsearchId.length > 0 ) {
			query = "SELECT * FROM " + tableModules + " WHERE id = " + lsearchId;
			window.localStorage.setItem( "search_id", "" );
		}
		else {
			/* Query for fixed modules */
			query = "SELECT * FROM " + tableModules + " WHERE category = " + category;
		}
		console.log("consulta: " + query);
		tx.executeSql( query, [], function( tx, result ) {
			var len = result.rows.length;
			//--htmlContent = '<fieldset data-role="controlgroup" data-iconpos="right" id="category_modules">';
			$("#general_form").html( "" );
			for( var i = 0; i < len; i++ ) {
				htmlContent += '<li data-icon="false" class="listado1">';
				console.log("el valor de i " + i);
				console.log("el valor de otro id " + result.rows.item(i).id);

				if( result.rows.item(i).image.length > 0 )
					htmlContent += '<img src="images/productos/' + result.rows.item(i).image + '" width="60" />';
				else
					htmlContent += '<img src="images/productos/icon_product2.png" width="60" />';
				
				htmlContent += '<h2><span id="name_item_' + result.rows.item(i).id + '">' + result.rows.item(i).name + '</span></h2>';
				htmlContent += '<p><span class="note">Cantidad: </span>';
				htmlContent += '<span id="stock_value_' + result.rows.item(i).id + '">' + result.rows.item(i).quantity + '</span>';
				htmlContent += ' <span class="note">Costo (Bs): </span>';
				htmlContent += '<span id="stock_cost_' + result.rows.item(i).id +'">';
				
				if( result.rows.item(i).cost.length > 0 )
					htmlContent += result.rows.item(i).cost;
				else
					htmlContent += "175";
				
				htmlContent += '</span>';
				htmlContent += '<div class="pedidos">';
				htmlContent += '<div class="ui-block-a">';
				htmlContent += '<input ';
				htmlContent += ' onblur="showAllToolbars(' + result.rows.item(i).id + ')"';
				
				htmlContent += ' onclick="hideAllToolbars(\'custom_value_' + result.rows.item(i).id + '\', ' + result.rows.item(i).id + ')"';
				//--htmlContent += ' onfocus="hideAllToolbars(\'custom_value_' + result.rows.item(i).id + '\', ' + result.rows.item(i).id + ')"';
				//--htmlContent += ' onchange="changeValues(\'custom_value_' + result.rows.item(i).id + '\',' + result.rows.item(i).id + ')"';
				htmlContent += ' id="custom_value_' + result.rows.item(i).id + '" class="bigInput" ';
				htmlContent += ' type="number" value="" size="3" />';
				htmlContent += '</div>';
				htmlContent += '<div class="ui-block-b">';
				//--htmlContent += '<input type="button" class="order_button" id="order_button_' + result.rows.item(i).id + '" name="order_button_' + result.rows.item(i).id + '" ';
				htmlContent += '<input type="button" class="order_button" id="' + result.rows.item(i).id + '" name="order_button_' + result.rows.item(i).id + '" ';
				htmlContent += ' data-inline="true" data-mini="true" data-theme="c" value="Pedir" class="bigInput2"';
				htmlContent += ' onclick="changeValues(\'custom_value_' + result.rows.item(i).id + '\',' + result.rows.item(i).id + ')" data-icon="check" />';
				htmlContent += '</div>';
				htmlContent += '</div>';
				htmlContent += '</p>';
				htmlContent += '</li>';
			}
			
			//--htmlContent += '</fieldset>';
			
			$("#general_form").html( $("#general_form" ).html() + htmlContent );
			$("#general_form").listview("refresh");
			$("#general_form").trigger( "create" );
			
			if( populateDatabase ) {
				populateList();
			}
			
			
		}, errorCB );
	}, errorCB, successCB );
}

function hideAllToolbars(id_elem, id) {
	console.log("ocultar toolbar");
	
	/*change button text*/
	//--console.log("el valor de orden button " + $("#order_button_" + id) + "----" + $("#order_button_" + id).val());
	/*$("#order_button_" + id).val("Anadir");*/
	/*$("#order_button_" + id).siblings('.ui-btn-inner').children('.ui-btn-text').text('some text');*/
	
	//--------$("#order_button_" + id).buttonMarkup({theme: 'b'});
	$("#" + id).buttonMarkup({theme: 'b'});
    
	/*$("#the_footer").css('display', 'none');
	$("#the_footer").css('visibility', 'hidden');*/
	
	/*$("#costo_tiempo").css('display', 'none');
	$("#costo_tiempo").css('visibility', 'hidden');*/
	$("#header_comp").css('display', 'none');
	$("#header_comp").css('visibility', 'hidden');
	
	console.log("elemento que recibe el foco " + id_elem);
	$('#' + id_elem).select();
    $('#' + id_elem).focus();
}

function showAllToolbars( id ) {
	//-----$("#order_button_" + id).buttonMarkup({theme: 'c'});
	$("#" + id).buttonMarkup({theme: 'c'});
	
	/*$("#the_footer").css('display', 'block');
	$("#the_footer").css('visibility', 'visible');*/
	
	/*$("#costo_tiempo").css('display', 'block');
	$("#costo_tiempo").css('visibility', 'visible');*/
	$("#header_comp").css('display', 'block');
	$("#header_comp").css('visibility', 'visible');
	//--$("#header_comp").trigger('create');
	
	/*$("#general_form").listview("refresh");
	$("#general_form").trigger( "create" );*/
}

/**
 * Function to store values into the cellphone
 * @param key string, key to save value
 * @param value mixed, value to save
 */
function setLocalValue( key, value ) {
	window.localStorage.setItem( key, value );
	/*console.log("key: " + key + ", value: " + value);
	console.log( getLocalValue( key ) );*/
	window.location.href = "paquetes_detalle.html";
}

/**
 * Function to get a stored value
 * @param key string, value's key to return
 * @returns mixed
 */
function getLocalValue( key ) {
	if( window.localStorage.getItem( key ) == null )
		return '';
	else
		return window.localStorage.getItem( key );
}

/**
 * Function to clear internal storage
 */
function clearLocalValue() {
	window.localStorage.clear();
}

/**
 * Function to hide all form warnings
 */
function hideAllWarnings() {
	//--var textTypeFields = new Array( 'name', 'empresa', 'telefono', 'email', 'lugar' );
	var textTypeFields = new Array( 'name', 'telefono', 'email', 'lugar' );
	
	for( var i = 0; i < textTypeFields.length; i++ ) {
	    $("#" + textTypeFields[i] + "_msg").hide();
	}
	
	$("#email_msg_format").hide();
}

/**
 * Function to validate form fields
 * 
 * @return bool
 */
function validateFields() {
	// hide all previous warnings
	hideAllWarnings();
	console.log("validando campos");
		
	var err = false;
		
	//--var textTypeFields = new Array( 'name', 'empresa', 'telefono', 'email', 'lugar' );
	var textTypeFields = new Array( 'name', 'telefono', 'email', 'lugar' );
	
	// Check if text fields have content
	for( var i = 0; i < textTypeFields.length; i++ ) {
		if( $( "#" + textTypeFields[i] ).val().length == 0 ) {
			$( "#" + textTypeFields[i] + "_msg" ).toggle();
			$( "#" + textTypeFields[i] ).select();
			$( "#" + textTypeFields[i] ).focus();
			err = true;
			return err;
			break;
		}
	}
		
	// Check if there is a valid email address
	if( !checkEmail( $("#email").val() ) && !err ) {
		$("#email_msg_format").toggle();
		err = true;
	}
	console.log("el valor de err " + err);
	if(!err) {
		$("#contact_message").html("Enviando pedido..., <br />por favor espere.");
		initializeDB();
		var elementos = new Array();
		db.transaction( function(tx) {
			tx.executeSql('SELECT * FROM orders', [], function(tx, results) {
				var len = results.rows.length;
				for (var i=0; i < len; i++){
		            elementos[i] = results.rows.item(i).id_mod +";"+ results.rows.item(i).cost + ";" + results.rows.item(i).cant;
		        }
				
				var name = $("#name").val();
				var company = $("#client").val(); //---$("#empresa").val();
				var telephone = $("#telefono").val();
				var email = $("#email").val();
				var city = $("#lugar").val();
				var modules = '';
				var pack = '';
				var tiempo = '';
				var costo = '';
				var datos = elementos.join("-");
				
				console.log("los datos a enviar " + datos);
				
				$.ajax({
					type: "POST",
					url: "http://www.enbolivia.com/class/sendcot3.php",
					data: ({"frmnombre": name,"frmempresa": company, "frmtelefono": telephone, "frmmail": email, "frmlugar": city, "frmpaquetes": datos, "frmidpaquete": pack, "frmtiempo": tiempo, "frmcosto": costo}),
					cache: false,
					dataType: "text",
					success: envioSatisfactorio,
					error: function() {navigator.notification.alert("Su cotizaci\u00f3n no se pudo enviar.", function() {}, "Formulario de Contactos", "Aceptar");}
				});
				
			}, errorCB);
		}, errorCB, successCB);
	}
	
	return err;
}

function envioSatisfactorio( data ) {
	navigator.notification.alert("Su cotizaci\u00f3n se envio satisfactoriamente.", function() {}, "Formulario de Contactos", "Aceptar");
	window.location.href = "index.html";	
}

/**
 * Function to validate email address
 */
function checkEmail( sEmail ) {
	var filter = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
	
	if( filter.test( sEmail ) )
		return true;
	else
		return false;
}

function showPopUp( defaultValue ) {
	$( "#amount" ).val( 0 );
	
	$( "div#popupLogin" ).css( "display", "block" );
	$( "div#popupLogin" ).css( "visibility", "visible" );
	
	$( "#general_form" ).css( "display", "block" );
	$( "#general_form" ).css( "visibility", "hidden" );
}

function newOrder() {
	initializeDB();
	console.log("deleting previous orders");
	db.transaction( function( tx ){
		tx.executeSql('DELETE FROM orders', [], function(tx, results){
			console.log("database cleaned");
			window.location.href = "paquetes.html";			
		} , errorCB );	
	}, errorCB, successCB);
}

//function lost() {console.log("true"); return false;}
function orderItem(){
	/* get global values */
	var lCost = parseFloat( $( '#cost' ).val() );
	var lQuantity = parseInt( $( '#quantity' ).val() );
	
	/* get selected values */
	var selCost = parseFloat( $( '#costCurrentId' ).val() );
	var selQuantity = parseInt( $( '#stockCurrentId' ).val() );
	
	/* entered value */
	var amount = parseInt( $( '#amount' ).val() );
	
	/* ordered item */
	var cOrderedItem = $( '#ordered_item_' + $( '#currentId' ).val() );
	var orderedAmount = parseInt( cOrderedItem.html() );
	
	/* stock item */
	var cStockValue = $( '#stock_value_' + $( '#currentId' ).val() );
	var stockValue = parseInt( cStockValue.html() );
	
	$( '#cost' ).val( lCost + ( selCost * amount ) );
	$( '#quantity' ).val( lQuantity + amount );
	
	console.log( "Total stock " + stockValue);
	cOrderedItem.html( orderedAmount + amount );
	
	cStockValue.html( stockValue - amount );
	
	/* Show list */
	$( "#general_form" ).css( "display", "block" );
	$( "#general_form" ).css( "visibility", "visible" );
	
	/* Hide popup */
	$( "div#popupLogin" ).css( "display", "none" );
	$( "div#popupLogin" ).css( "visibility", "hidden" );
}

/**
 * Function to change the values of Time and Cost in detail package page
 * @param time float, time it will take to develop
 * @param cost float, cost it will take to develop
 * @param element DOM element
 */
function changeValues( element, id ) {
	console.log("insertando valores");
	/* stock item */
	var cStockValue = $( '#stock_value_' + $( '#currentId' ).val() );
	var stockValue = parseInt( cStockValue.html() );
	
	/* cost item */
	var cCostValue = $( '#stock_cost_' + id );
	var costValue = parseFloat( cCostValue.html() );
	
	/* name item */
	var nameItem = $('#name_item_' + id);
	var nameItemValue = nameItem.html(); 
	
	var lElement = $( '#' + element );
	var elementVal = 0;
	
	if( lElement.val().length > 0 ) {
		elementVal = parseInt( lElement.val() ); 
		
		console.log("nombre a insertar " + nameItemValue);
		orders[id] = new Array(2);
		orders[id][0] = elementVal;
		orders[id][1] = elementVal * costValue;
		
		db.transaction( function(tx) {
			
			tx.executeSql('SELECT * FROM orders WHERE id_mod=' + id, [], function(tx, results) {
				var len = results.rows.length;
				var variableExiste = false;
				var variableID;
				
				for( var i=0; i<len; i++ ) {
					if( results.rows.item(i).id_mod = id ) {
						variableExiste = true;
						variableID = results.rows.item(i).id;
						break;
					}				
				}
				
				if( variableExiste ) {
					tx.executeSql('UPDATE orders SET cost = "' + costValue + '", cant = "' + elementVal + '" WHERE id=' + variableID );
					console.log("updating id " + variableID);
				}
				else {
					tx.executeSql('INSERT INTO orders (id_mod, name,cost, cant) VALUES (' + id + ', "' + nameItemValue + '", "' + costValue + '", ' + elementVal + ')');
					console.log("inserting id_mod " + id );
				}
				
			}, errorCB );
			
		}, errorCB, successCB);
		
		recalculate();
	}
	/*else {
		hideAllToolbars(element);
	}*/
	showAllToolbars();
}

function recalculate() {
	var tAmount = 0;
	var tCost = 0;
	
	for( var i in orders ) {
		var item = orders[i];
		
		tAmount += item[0];
		tCost += item[1]; 
	}
	
	$( '#quantity' ).val( tAmount );
	$( '#cost' ).val( tCost );
}

function discountingPrice( id ) {
	var itemCostVal = parseFloat( $( '#stock_cost_' + id ).html() );
	var itemStockControl = $( '#stock_value_' + id );
	var itemOrderedControl = $( '#ordered_item_' + id );
	var itemStockVal = parseFloat( itemStockControl.html() );
	var itemOrderedVal = parseFloat( itemOrderedControl.html() );
	
	var globalCost = parseFloat( $('#cost').val() );
	var globalAmount = parseInt( $('#quantity').val() );
	
	/* decreasing the amount */
	$('#quantity').val( globalAmount - itemOrderedVal );
	
	/* decreasing the cost */
	$('#cost').val( globalCost - ( itemCostVal * itemOrderedVal ) );
	
	/* restoring the real stock */
	itemStockControl.html( itemStockVal + itemOrderedVal );
	itemOrderedControl.html( 0 );
}

/**
 * Function to return packages from DB
 */
function getPackages() {
	var lImage;
	initializeDB();
	
	db.transaction( function( tx ) {
		tx.executeSql( "SELECT * FROM " + tablePackages, [], function( tx, result ) {
			var htmlContent = '';
			var len = result.rows.length;
			$("#packages").html( "" );
			
			for( var i = 0; i < len; i++ ) {
				for( var j = 0; j < imagesPack.length; j++ ) {
					if( imagesPack[j][0] == result.rows.item(i).id )
						lImage = imagesPack[j][1]; 
				}
				//--console.log( "title: " + result.rows.item(i).title );
				//--htmlContent += '<li><a href="#" onclick="getModules( \'' + result.rows.item(i).fixed_modules + '\', \'' + result.rows.item(i).modules + '\', \'' + result.rows.item(i).optional_modules + '\' )">' + result.rows.item(i).title + '</a></li>';
				htmlContent += '<li>';
				htmlContent += '<a href="#" onclick="';
				htmlContent += 'setLocalValue( \'modules\' , \'' + result.rows.item(i).id_mod + '\');';
				htmlContent += 'setLocalValue( \'name\' , \'' + result.rows.item(i).name + '\' );';
				htmlContent += 'setLocalValue( \'title\' , \'' + result.rows.item(i).name + '\' );';
				htmlContent += 'setLocalValue( \'description\', \'' + result.rows.item(i).description + '\' )';
				htmlContent += '">';
				htmlContent += '<img src="images/' + result.rows.item(i).image + '" width="80" />';
				htmlContent += '<h2>' + result.rows.item(i).name + '</h2>';
				htmlContent += '<p>' + result.rows.item(i).description + '</p><br />';
				htmlContent += '</a>';
				htmlContent += '</li>';
			}
			
			$("#packages").html( $("#packages").html() + htmlContent );
			$("#packages").listview("refresh");
			
		}, errorCB );
	}, errorCB, successCB );
}

function fillClients() {
	initializeDB();
	
	db.transaction( function( tx ) {
		tx.executeSql( "SELECT * FROM clients", [], function( tx, result ){
			var len = result.rows.length;
		
			for( var i = 0; i < len; i++ ) {
				$("#client").append('<option value="' + result.rows.item(i).id_mod + '">' + result.rows.item(i).name + ' - ' + result.rows.item(i).branch  + '</option>');	
			}
			
			console.log("finalizando lista");
			$("#client").selectmenu("refresh");
		}, errorCB );
	}, errorCB, successCB );
}

/**
 * Function to create modules table
 * @param tx, SQLTransaction object
 */
function createModuleTable( tx ) {
	var query = "CREATE TABLE IF NOT EXISTS " + tableModules + " (" +
			"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"name TEXT NOT NULL, " +
			"description TEXT NULL, " +
			"category INT NOT NULL, " +
			"cost REAL NOT NULL, " +
			"quantity INT NOT NULL, " +
			"image TEXT NULL)";
	
	tx.executeSql( query, [], function ( tx,  result ) {
		console.log( "Table " + tableModules + " created successfully" );
	}, errorCB );
	
	query = "CREATE INDEX IF NOT EXISTS category ON " + tableModules + " (category)";
	 
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Index in " + tableModules + " created successfully" );
	}, errorCB );
}

/**
 * Function to create packages table and add to it and index 
 * @param tx. SQLTransaction object
 */
function createPackageTable( tx ) {
	var query = "CREATE TABLE IF NOT EXISTS " + tablePackages + " (" +
			"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"id_mod INT NOT NULL, " +
			"name TEXT NOT NULL, " +
			"description TEXT NULL, " +
			"image TEXT NULL)";
	
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Table " + tablePackages + " created successfully" );
	}, errorCB );
	
	query = "CREATE INDEX IF NOT EXISTS id_mod ON " + tablePackages + " (id_mod)";
	
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Index in " + tablePackages + " created successfully" );
	}, errorCB );
}

function createOrderTable( tx ) {
	var query = "CREATE TABLE IF NOT EXISTS orders (" +
			"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"id_mod INTEGER NOT NULL, " +
			"name TEXT, " +
			"cost INTEGER NOT NULL, " +
			"cant REAL NULL)";
	
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Table orders created successfully" );
	}, errorCB );
	
	query = "CREATE INDEX IF NOT EXISTS id_mod ON orders (id_mod)";
	
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Index in orders created successfully" );
	}, errorCB );
	
	tx.executeSql( "SELECT * FROM orders", [], function ( tx, result ) {
		var len = result.rows.length;
		console.log("obteniendo orders");
		
		for( var i=0; i < len; i++ ) {
			orders[result.rows.item(i).id_mod] = new Array(3);
			orders[result.rows.item(i).id_mod][0] = result.rows.item(i).cant;
			orders[result.rows.item(i).id_mod][1] = result.rows.item(i).cant * result.rows.item(i).cost;
			orders[result.rows.item(i).id_mod][2] = result.rows.item(i).id_mod;
		}
		
		recalculate();
		
		/*if( populateDatabase ) {
			populateList();
		}*/
		
	}, errorCB );
}

function createClientsTable( tx ) {
	var query = "CREATE TABLE IF NOT EXISTS clients (" +
			"id INTEGER PRIMARY KEY AUTOINCREMENT, " +
			"id_mod INTEGER NOT NULL, " +
			"name TEXT, " +
			"branch TEXT)";
	
	tx.executeSql( query, [], function ( tx, result ) {
		console.log( "Table clients created successfully" );
	}, errorCB );
}

function populateList() {
	/*console.log("populating db");
	
	for(var i in orders) {
		var item = orders[i];
		console.log("el valor " + item[0]);
		$('#custom_value_' + i).val(item[0]);
	}*/
}

/**
 * Function to check if there are tables in the SQLite database
 * @param tx, SQLTransaction object
 */
function checkCurrentTables( tx ) {
	var query = "SELECT name FROM sqlite_master WHERE type='table'";
	
	tx.executeSql( query, [], function( tx, result ) {
		var len = result.rows.length;
		
		for( var i = 0; i < len; i++ ) {
			console.log( "Tablas existentes " + result.rows.item(i).name );
			/* check if database table is already created */
			if( result.rows.item(i).name == tablePackages ) {
				tablePackagesExists = true;
			}
			
			if( result.rows.item(i).name == tableModules ) {
				tableModulesExists = true;
			}
			
			if(result.rows.item(i).name == "orders") {
				tableOrdersExists = true;
			}
			
			if(result.rows.item(i).name == "clients") {
				tableClientsExists = true;
			}
		}
	}, errorCB );
}

/**
 * Function executed when a SQL error ocurred
 */
function errorCB( err ) {
	console.log( "There was an error procesing the sql query." );
}

/**
 * Function executed when a SQL error is success
 */
function successCB() {
	console.log( "Transaction executed successfully" );
}