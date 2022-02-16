// a constant used to indicate a function that does nothing
var NOOP = function() {}

// a flag indicates whether to output debug info
var DEBUG_INFO_ON = false

// ------------------------------------------------------------------------
//   Find the font family, size and face for the provided node in the
//   HTML dom.  The result object contains fontSize, fontFamily and
//   fontFace entries.
//
function findFont( obj )
{
	var result = new Object();
	if ( obj.currentStyle ) {
		result.fontSize = obj.currentStyle[ 'fontSize' ];
		result.fontFamily = obj.currentStyle[ 'fontFamily' ];
		result.fontFace = obj.currentStyle[ 'fontFace' ];
	} else if ( document.defaultView && document.defaultView.getComputedStyle ) {
		var computedStyle = document.defaultView.getComputedStyle( obj, "" );
		result.fontSize = computedStyle.getPropertyValue( 'font-size' );
		result.fontFamily = computedStyle.getPropertyValue( 'font-family' );
		result.fontFace = computedStyle.getPropertyValue( 'font-face' );
	}
	return result;
}

// ---------------------------------------------------------------------------

/*
	Find the bounds of the specified node in the DOM.  This returns
	an objct with x,y, height and width fields
*/
function findBounds( obj )
{
	var bounds = new Object();
	bounds.x = 0;
	bounds.y = 0;
	bounds.width = obj.scrollWidth;
	bounds.height = obj.scrollHeight;
	if( obj.x != null ) {
		bounds.x = obj.x;
		bounds.y = obj.y;
	}
	else {
		while( obj.offsetLeft != null ) {
			bounds.x += obj.offsetLeft;
			bounds.y += obj.offsetTop;
			if( obj.offsetParent ) {
				obj = obj.offsetParent;
			}
			else {
				break;
			}
		}
	}
			
	// subtract the amount the page is scrolled from position
	if (self.pageYOffset) // all except Explorer
	{
		bounds.x -= self.pageXOffset;
		bounds.y -= self.pageYOffset;
	}
	else if (document.documentElement && document.documentElement.scrollTop)
		// Explorer 6 Strict
	{
		bounds.x -= document.documentElement.scrollLeft;
		bounds.y -= document.documentElement.scrollTop;
	}
	else if (document.body) // all other Explorers
	{
		bounds.x -= document.body.scrollLeft;
		bounds.y -= document.body.scrollTop;
	}

	return bounds;
}

// ---------------------------------------------------------------------------

var isFirefoxPat = /Firefox\/([0-9]+)[.]([0-9]+)[.]([0-9]+)/;
var firFoxArr = isFirefoxPat.exec( navigator.userAgent );
var isSafariPat = /AppleWebKit\/([0-9]+)[.]([0-9]+)/;
var safariArr = isSafariPat.exec( navigator.userAgent );

// ---------------------------------------------------------------------------

/*
	Default implementation does nothing when viewing the webpage normally
*/
var clickTarget = NOOP;
var tellLightroomWhatImagesWeAreUsing = NOOP;
var setActiveImageSize = NOOP;
var callCallback = NOOP;
var pushresult = NOOP;

// ---------------------------------------------------------------------------

callCallback = function() {
	var javascript = 'myCallback.' + arguments[ 0 ] + "( ";
	var j = arguments.length;
	var c = j - 1;
	for( var i = 1; i < j; i++ ) {
		var arg = arguments[ i ];
		if( typeof( arg ) == 'string' ) {
			javascript = javascript + '"' + arg + '"';
		}
		if( typeof( arg ) == 'number' ) {
			javascript = javascript + arg
		}
		if( typeof( arg ) == 'undefined' ) {
			javascript = javascript + 'undefined'
		}
		if( i < c ) {
			javascript = javascript + ", "
		}
	}
	javascript = javascript + " )"
	myExt.hosteval( javascript )
}

pushresult = function( result ) {
	callCallback( "pushresult", result )
}

// ---------------------------------------------------------------------------

/*
	Set up live feedback between Lightroom and the previewed web page.
*/
if( callCallback != NOOP ) {
	setActiveImageSize = function( size ) {
		document.activeImageSize = size;
		callCallback( "setActiveImageSize", size );
	}

	tellLightroomWhatImagesWeAreUsing = function() {

		if( window.myCallback != null ) {
			var imgElements = document.getElementsByTagName( "img" );
			var elsLen = imgElements.length;
			var result = new Array()
			for( i = 0; i < elsLen; i++ ) {
				var element = imgElements[ i ];
				var imageID = element.id;
				// for html validation purposes, we've prepended "ID" to the GUID for this
				// image, so now we strip that off.
				imageID = imageID.substring( 2 );
				result[ i ] = imageID;
			}
			myCallback.setUsedFiles( result );
		}
	}

	tellLightroomCurrentImageCount = function() {
		var imgElements = document.getElementsByTagName( "img" );
		var imgCount = imgElements.length;
		callCallback("setImageCount", imgCount);
	}

	clickTarget = function( obj, target, imageID ) {
		if( imageID != null ) {
			// for html validation purposes, we've prepended "ID" to the GUID for this
			// image, so now we strip that off.
			imageID = imageID.substring( 2 );
		}
		var bounds = findBounds( obj );
		var font = findFont( obj );
		callCallback( 'inPlaceEdit', target, bounds.x, bounds.y, bounds.width, bounds.height, font.fontFamily, font.fontSize, imageID )
	}

	AgDebugPrint = function( message ) {
		if (DEBUG_INFO_ON)
			callCallback( 'AgDebugPrint', message );
	}
}

// ---------------------------------------------------------------------------

if( firFoxArr && ( firFoxArr[1] > 1 || firFoxArr[2] > 4 ) ||
      safariArr ) {
	window.gridOn = NOOP;
	window.gridOff= NOOP;
}
else {
	window.gridOn = function( t, id ) {
		t.agOriginalClassName = t.className;
		t.className =  "selectedThumbnail " + t.className;
	};
	window.gridOff= function( t ) {
		t.className = t.agOriginalClassName;
	};
}

var needThumbImgLink = !isFirefoxPat;


var oldOnLoad = window.onload;
window.onload = function() {
	if( window.AgOnLoad ) {
		window.AgOnLoad();
	}
	if( oldOnLoad ) {
		oldOnLoad();
	}
};

//------------------------------------------------------------

document.liveUpdateImageMaxSize = function( id, value ) {
	var targetArr = id.split(/[ \t\r\n]*,[ \t\r\n]*/);
	for( i = 0; i < targetArr.length; i++ ) {
		var target = targetArr[i];
		var idRegex = new RegExp( "^[#](.+$)" );
		var theId = idRegex.exec( target );
		if( theId && theId[ 1 ] ) {
			var item = document.getElementById( theId[ 1 ] );
			if( item ) {

				// scale image size
				var max = item.width;
				if( item.height > max ) {
					max = item.height;
				}
				item.width = item.width * value / max;
				item.height = item.height * value / max;
			}
		}
	}


	return "invalidateAllContent";
}

//------------------------------------------------------------

document.liveUpdateProperty = function( id, property, value ) {

	var targetArr = id.split(/[ \t\r\n]*,[ \t\r\n]*/);
	var clasRegex = new RegExp( "^[.](.+$)" );
	var idRegex = new RegExp( "^[#](.+$)" );
	var comboRegex = new RegExp( "[ \t\r\n]" );
	var pseudoRegex = new RegExp( "^.+[:](.+$)" );
	var returnValue = "";
	
	for( i = 0; i < targetArr.length; i++ ) {
		var target = targetArr[i];
		var theClass = clasRegex.exec( target );
		var theId = idRegex.exec( target );
		
		AgDebugPrint( "document.liveUpdateProperty, target " + target + ", theClass " + theClass + ", theId " + theId);
		
		
		if( comboRegex.exec( target ) ) {
			returnValue = "failed";
		}
		else if( theClass && pseudoRegex.test( target ) ){
			/*
			ashj: Only handles the pseudo classes of the form 
			.<class>:<pseudo-class>( eg:.thumbnail:hover)
			Refer Bug: 3859721.
			*/
			AgDebugPrint(  "document.liveUpdateProperty, is a pseudo element" );
			var pseudoElt = pseudoRegex.exec( target )[1];
			var ofClass = target.substring(1, target.indexOf(':'));
			var styleId = ofClass+"_"+pseudoElt;
			var head = document.getElementsByTagName('head')[0];
			var  styleElt = document.getElementById(styleId);
			var styleText = target+"{"+ property + ": " + value + " !important; " +"}";
			
			AgDebugPrint(  "document.liveUpdateProperty, styleId="+styleId+", styleText="+styleText );
			
			if ( !styleElt ){
				AgDebugPrint(  "document.liveUpdateProperty, styleElt: Creating new" );
				styleElt = document.createElement('style');
				styleElt.type = 'text/css';
				styleElt.id = styleId;
				head.appendChild(styleElt);
			}
			else {
				AgDebugPrint(  "document.liveUpdateProperty, styleElt: Reusing old" );
				while (styleElt.firstChild) {
					styleElt.removeChild(styleElt.firstChild);
				}
			}
			
			if (styleElt.styleSheet) {
				AgDebugPrint( "document.liveUpdateProperty: Adding property hover style sheet exists");
				styleElt.styleSheet.cssText = styleText;
			} else {
				styleElt.appendChild(document.createTextNode(styleText));
			}
			if( returnValue == ""){
				returnValue = "invalidateOldHTML";
			}
		}
		else if( theClass) {
			
			var pattern = new RegExp( "(^|\\s)" + theClass[1] + "(\\s|$)" );
			var items = document.getElementsByTagName( '*' );
			for( o = 0; o < items.length; o++ ) {
				var item = items[ o ];
				if( pattern.test( item.className ) ){
					item.style.setProperty( property, value, "important" );
				}
			}
			AgDebugPrint( "document.liveUpdateProperty theClass" );
			if( returnValue == ""){
				returnValue = "invalidateOldHTML";
			}
		}
		else if( theId ) {
			if( property == "maxSize" ) {
				AgDebugPrint( "document.liveUpdateProperty theId, maxSize" );
				return document.liveUpdateImageMaxSize( id, value );
			}
			var item = document.getElementById( theId[ 1 ] );
			if( item ) {
				item.style.setProperty( property, value, "important");
			}
			
			AgDebugPrint( "document.liveUpdateProperty theId" );
			returnValue = "invalidateAllContent";
		}
		else {
			var items = document.getElementsByTagName( target);
			for( i = 0; i < items.length; i++ ) {
				var item = items[i];
				item.style.setProperty( property, value, "important" );
			}
			
			AgDebugPrint( "document.liveUpdateProperty else" );
			if( returnValue == ""){
				returnValue = "invalidateOldHTML";
			}
		}
	}
	AgDebugPrint( "document.liveUpdateProperty Returing:"+ returnValue );
	return returnValue;
};

//------------------------------------------------------------

function esc( pre ) {
	pre = pre.replace( /&/g, "&amp;" );
	pre = pre.replace( /</g, "&lt;" );
	return pre;
}

//------------------------------------------------------------

function escapeForHtml( value ) {

	// escape < and & but preserve </html>
	var result = "";
	var index = 0;
	var pat = /(.*?)(<[\/a-zA-Z]?[^&<>]+>)/g;
	var chunk;
	while( ( chunks = pat.exec( value ) ) != null ) {
		var pre = chunks[ 1 ];
		var node = chunks[ 2 ];
		index += pre.length + node.length;
		pre = esc( pre )
		result = result + pre + node;
	}
	result = result + esc( value.substring( index ) )

	return result;
}

//------------------------------------------------------------

document.liveUpdate = function( path, newValue, cssId, property ) {
	AgDebugPrint( "document.liveUpdate( " + path + ", " + newValue + ", " + cssId + " , " + property + " ) " );
	var success = "failed";
	var reg = /(^[^.]+)\./;
	var ar = reg.exec( path );
	if( ar == null ) {

		// override result if we drove this change ourselves
		if( document.LR_modelManipulation ) {
			AgDebugPrint( "return invalidateOldHTML" );
			return "invalidateOldHTML";
		}
		return "failed";
	}
	var area = ar[1];
	if( area == "metadata" ) {
		// our html is built so that the HTML ids are the metadata path
		var a = document.getElementById( path );
		if (a != null) {
			while(a.hasChildNodes()) {
				a.removeChild(a.firstChild);
			}
			newValue = escapeForHtml( newValue );
			a.innerHTML = newValue;
		}
		success = "invalidateOldHTML";
		
		AgDebugPrint( "return invalidateOldHTML (area == metadata)" );
	}
	else if( area == "appearance" ) {
		success = document.liveUpdateProperty( cssId, property, newValue );
		AgDebugPrint( "return "+success+" (area == appearance)" );
	}
	else if( path == "nonCSS.tracking" ) {
		success = "";
		AgDebugPrint( "return "+success+" (path == nonCSS.tracking)" );
	}
	else if ( area == "nonCSS" ) {
		if( newValue == null || newValue == "null") {
			success = "failed";
			AgDebugPrint( "return failed (area == nonCSS)" );
		} 
		else if (property == "numRows" || property == "numCols")
			return "invalidateAllContent";
		else if ( property == "dropShadows"){
			success = "invalidateHTMLLayout";
			AgDebugPrint( "return invalidateHTMLLayout (area == nonCSS)" );
		}
		else {
			success = "invalidateOldHTML";
			AgDebugPrint( "return invalidateOldHTML (area == nonCSS)" );
		}
	}
	else {
		AgDebugPrint("How do I update " + path + " to " + newValue )
	}

	// override result if we drove this change ourselves
	if( document.LR_modelManipulation ) {
		AgDebugPrint( "return invalidateOldHTML (document.LR_modelManipulation)" );
		return "invalidateOldHTML";
	}
	return success;
}

//------------------------------------------------------------

document.liveUpdateImageSize = function( imageID, width, height ) {

	var img = document.getElementById( 'ID' + imageID );
	img.style.width = width + 'px';
	img.style.height = height + 'px';
	return "invalidateAllContent";
}

//------------------------------------------------------------
