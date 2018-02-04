/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

( function() {
	'use strict';

	var stylesLoaded = false,
		WIDGET_NAME = 'easyimage';

	function capitalize( str ) {
		return CKEDITOR.tools.capitalize( str, true );
	}

	function getStylesForEditor( editor ) {
		var defaultStyles = {
			full: {
				attributes: {
					'class': 'easyimage-full'
				},
				label: editor.lang.easyimage.commands.fullImage
			},

			side: {
				attributes: {
					'class': 'easyimage-side'
				},
				label: editor.lang.easyimage.commands.sideImage
			},

			alignLeft: {
				attributes: {
					'class': 'easyimage-alignLeft'
				},
				label: editor.lang.easyimage.commands.alignLeft
			},

			alignCenter: {
				attributes: {
					'class': 'easyimage-alignCenter'
				},
				label: editor.lang.easyimage.commands.alignCenter
			},

			alignRight: {
				attributes: {
					'class': 'easyimage-alignRight'
				},
				label: editor.lang.easyimage.commands.alignRight
			}
		};

		return CKEDITOR.tools.object.merge( defaultStyles, editor.config.easyimage_styles );
	}

	function addCommands( editor, styles ) {
		function createCommandRefresh( enableCheck ) {
			return function( editor, path ) {
				var widget = editor.widgets.focused;

				if ( widget && widget.name === WIDGET_NAME ) {
					var callbackResolution = enableCheck && enableCheck.call( this, widget, editor, path ),
						state = enableCheck ? callbackResolution : CKEDITOR.TRISTATE_OFF;

					if ( typeof callbackResolution !== 'number' ) {
						state = callbackResolution ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF;
					}

					this.setState( state );
				} else {
					this.setState( CKEDITOR.TRISTATE_DISABLED );
				}
			};
		}

		function createStyleCommand( editor, name, styleDefinition, commandName ) {
			styleDefinition.type = 'widget';
			styleDefinition.widget = 'easyimage';
			styleDefinition.group = styleDefinition.group || 'easyimage';
			styleDefinition.element = 'figure';
			var style = new CKEDITOR.style( styleDefinition );
			editor.filter.allow( style );

			var cmd = new CKEDITOR.styleCommand( style, {
				contextSensitive: true
			} );

			editor.addCommand( commandName, cmd );

			// Command needs to be refretched. Calling addCommand will… create a new command.
			cmd = editor.getCommand( commandName );

			// These commands must trigger refresh.
			editor.on( 'afterCommandExec', function( evt ) {
				if ( evt.data.command.name === cmd.name ) {
					editor.forceNextSelectionCheck();
					editor.selectionChange( true );
				}
			} );

			editor.on( 'beforeCommandExec', function( evt ) {
				// Same style command can not be toggled.
				var executedCommand = evt.data.command;
				if ( executedCommand.name === cmd.name ) {
					if ( executedCommand.style.checkActive( evt.editor.elementPath(), editor ) ) {
						evt.cancel();
						evt.stop();
					}
				}
			} );

			editor.on( 'mode', function() {
				cmd.refresh( editor, editor.elementPath() );
			}, null, null, 100 );

			cmd.refresh = createCommandRefresh( function( widget, editor, path ) {
				return this.style.checkActive( path, editor );
			} );

			// Enable is called at multiple occasions, especially in ediotr#mode event listeners.
			// Unfortunately it's even called with a timeout there.
			cmd.enable = function() {};

			// Without this the command is inited in a wrong state.
			cmd.refresh( editor, editor.elementPath() );

			return cmd;
		}

		function addDefaultCommands() {
			editor.addCommand( 'easyimageAlt', new CKEDITOR.dialogCommand( 'easyimageAlt', {
				startDisabled: true,
				contextSensitive: true,
				refresh: createCommandRefresh()
			} ) );
		}

		function addStylesCommands( styles ) {
			var style;

			for ( style in styles ) {
				createStyleCommand( editor, style, styles[ style ], 'easyimage' + capitalize( style ) );
			}
		}

		addDefaultCommands();
		addStylesCommands( styles );
	}

	function addButtons( editor, styles ) {
		function createButton( button ) {
			editor.ui.addButton( button.name, {
				label: button.label,
				command: button.command,
				toolbar: 'easyimage,' + ( button.order || 99 )
			} );
		}

		function addDefaultButtons() {
			createButton( {
				name: 'EasyimageAlt',
				label: editor.lang.easyimage.commands.altText,
				command: 'easyimageAlt',
				order: 3
			} );
		}

		function addStylesButtons( styles ) {
			var style;

			for ( style in styles ) {
				createButton( {
					name: 'Easyimage' + capitalize( style ),
					label: styles[ style ].label,
					command: 'easyimage' + capitalize( style ),
					order: 99
				} );
			}
		}

		addDefaultButtons();
		addStylesButtons( styles );
	}

	function addToolbar( editor ) {
		var buttons = editor.config.easyimage_toolbar;

		editor._.easyImageToolbarContext = editor.balloonToolbars.create( {
			buttons: buttons.join ? buttons.join( ',' ) : buttons,
			widgets: [ WIDGET_NAME ]
		} );
	}

	function addContextMenuItems( editor ) {
		var buttons = editor.config.easyimage_toolbar;

		if ( !editor.plugins.contextmenu ) {
			return;
		}

		if ( buttons.split ) {
			buttons = buttons.split( ',' );
		}

		editor.addMenuGroup( 'easyimage' );
		CKEDITOR.tools.array.forEach( buttons, function( button ) {
			button = editor.ui.items[ button ];

			editor.addMenuItem( button.name, {
				label: button.label,
				command: button.command,
				group: 'easyimage'
			} );
		} );
	}

	function updateMenuItemsStates( evt ) {
		var editor = evt.sender.editor,
			buttons = editor.config.easyimage_toolbar;

		if ( buttons.split ) {
			buttons = buttons.split( ',' );
		}

		CKEDITOR.tools.array.forEach( buttons, function( button ) {
			button = editor.ui.items[ button ];

			evt.data[ button.name ] = editor.getCommand( button.command ).state;
		} );
	}

	function registerWidget( editor, styles ) {
		var config = editor.config,
			figureClass = config.easyimage_class,
			widgetDefinition = {
				name: WIDGET_NAME,

				allowedContent: {
					figure: {
						classes: config.easyimage_sideClass
					},

					img: {
						attributes: '!src,srcset,alt,width,sizes'
					}
				},

				requiredContent: 'figure; img[!src]',

				styleableElements: 'figure',

				supportedTypes: /image\/(jpeg|png|gif|bmp)/,

				loaderType: CKEDITOR.plugins.cloudservices.cloudServicesLoader,

				progressReporterType: CKEDITOR.plugins.imagebase.progressBar,

				upcasts: {
					figure: function( element ) {
						if ( ( !figureClass || element.hasClass( figureClass ) ) &&
							element.find( 'img', true ).length === 1 ) {
							return element;
						}
					}
				},

				init: function() {
					// Natural width of the image can be fetched only after image is loaded.
					// However cached images won't fire `load` event, but just mark themselves
					// as complete.
					function getNaturalWidth( image, callback ) {
						var $image = image.$;

						if ( $image.complete && $image.naturalWidth ) {
							return callback( $image.naturalWidth );
						}

						image.once( 'load', function() {
							callback( $image.naturalWidth );
						} );
					}

					function setImageWidth( widget, height ) {
						if ( !widget.parts.image.hasAttribute( 'width' ) ) {
							widget.editor.fire( 'lockSnapshot' );

							widget.parts.image.setAttribute( 'width', height );

							widget.editor.fire( 'unlockSnapshot' );
						}
					}

					var imagePart = this.parts.image;

					if ( imagePart && !imagePart.$.complete ) {
						// If widget begins with incomplete image, make sure to refresh balloon toolbar (if present)
						// once the image size is available.
						getNaturalWidth( imagePart, function() {
							// Currently we're breaking encapsulation, once #1496 is fixed, we could use a proper method to
							// update the position.
							var contextView = editor._.easyImageToolbarContext.toolbar._view;

							if ( contextView.rect.visible ) {
								contextView.attach( contextView._pointedElement );
							}
						} );
					}

					// There is a special handling in paste listener, where the element (figure) would gain upload id temporarily.
					// This value should be removed afterwards.
					var loaderId = this.element.data( 'cke-upload-id' );

					if ( typeof loaderId !== 'undefined' ) {
						this.setData( 'uploadId', loaderId );
						this.element.data( 'cke-upload-id', false );
					}

					this.on( 'contextMenu', updateMenuItemsStates );

					if ( editor.config.easyimage_class ) {
						this.addClass( editor.config.easyimage_class );
					}

					this.on( 'uploadStarted', function() {
						var widget = this;

						getNaturalWidth( widget.parts.image, function( width ) {
							setImageWidth( widget, width );
						} );
					} );

					this.on( 'uploadDone', function( evt ) {
						var loader = evt.data.loader,
							resp = loader.responseData.response,
							srcset = CKEDITOR.plugins.easyimage._parseSrcSet( resp );

						this.parts.image.setAttributes( {
							'data-cke-saved-src': resp[ 'default' ],
							src: resp[ 'default' ],
							srcset: srcset,
							sizes: '100vw'
						} );
					} );

					this.on( 'uploadFailed', function() {
						alert( this.editor.lang.easyimage.uploadFailed ); // jshint ignore:line
					} );

					this._loadDefaultStyle();
				},

				_loadDefaultStyle: function() {
					// Ensures that Easy Image widget uses a default Easy Image style if none other is applied.
					var styleMatched = false,
						defaultStyleName = editor.config.easyimage_defaultStyle;

					for ( var styleName in styles ) {
						var cmd = editor.getCommand( 'easyimage' + capitalize( styleName ) );

						if ( !styleMatched && cmd && cmd.style && cmd.style.group === 'easyimage' && this.checkStyleActive( cmd.style ) ) {
							styleMatched = true;
						}
					}

					if ( !styleMatched && defaultStyleName && editor.getCommand( 'easyimage' + capitalize( defaultStyleName ) ) ) {
						this.applyStyle( editor.getCommand( 'easyimage' + capitalize( defaultStyleName ) ).style );
					}
				}
			};

		if ( figureClass ) {
			widgetDefinition.requiredContent += '(!' + figureClass + ')';
			widgetDefinition.allowedContent.figure.classes = '!' + figureClass + ',' + widgetDefinition.allowedContent.figure.classes;
		}

		if ( editor.plugins.link ) {
			widgetDefinition = CKEDITOR.plugins.imagebase.addFeature( editor, 'link', widgetDefinition );
		}

		widgetDefinition = CKEDITOR.plugins.imagebase.addFeature( editor, 'upload', widgetDefinition );
		widgetDefinition = CKEDITOR.plugins.imagebase.addFeature( editor, 'caption', widgetDefinition );

		CKEDITOR.plugins.imagebase.addImageWidget( editor, WIDGET_NAME, widgetDefinition );
	}

	function addPasteListener( editor ) {
		// Easy Image requires a img-specific paste listener for inlined images. This case happens in:
		// * IE11 when pasting images from the clipboard.
		// * FF when pasting a single image **file** from the clipboard.
		// In both cases image gets inlined as img[src="data:"] element.
		editor.on( 'paste', function( evt ) {
			if ( editor.isReadOnly ) {
				return;
			}

			// For performance reason do not parse data if it does not contain img tag and data attribute.
			if ( !evt.data.dataValue.match( /<img[\s\S]+data:/i ) ) {
				return;
			}

			var data = evt.data,
				// Prevent XSS attacks.
				tempDoc = document.implementation.createHTMLDocument( '' ),
				temp = new CKEDITOR.dom.element( tempDoc.body ),
				easyImageDef = editor.widgets.registered.easyimage,
				widgetsFound = 0,
				widgetElement,
				imgFormat,
				imgs,
				img,
				i;

			// Without this isReadOnly will not works properly.
			temp.data( 'cke-editable', 1 );

			temp.appendHtml( data.dataValue );

			imgs = temp.find( 'img' );

			for ( i = 0; i < imgs.count(); i++ ) {
				img = imgs.getItem( i );

				// Assign src once, as it might be a big string, so there's no point in duplicating it all over the place.
				var imgSrc = img.getAttribute( 'src' ),
					// Image have to contain src=data:...
					isDataInSrc = imgSrc && imgSrc.substring( 0, 5 ) == 'data:',
					isRealObject = img.data( 'cke-realelement' ) === null;

				// We are not uploading images in non-editable blocks and fake objects (https://dev.ckeditor.com/ticket/13003).
				if ( isDataInSrc && isRealObject && !img.isReadOnly( 1 ) ) {
					widgetsFound++;

					if ( widgetsFound > 1 ) {
						// Change the selection to avoid overwriting last widget (as it will be focused).
						var sel = editor.getSelection(),
							ranges = sel.getRanges();

						ranges[ 0 ].enlarge( CKEDITOR.ENLARGE_ELEMENT );
						ranges[ 0 ].collapse( false );
					}

					imgFormat = imgSrc.match( /image\/([a-z]+?);/i );
					imgFormat = ( imgFormat && imgFormat[ 1 ] ) || 'jpg';

					var loader = easyImageDef._spawnLoader( editor, imgSrc, easyImageDef );

					widgetElement = easyImageDef._insertWidget( editor, easyImageDef, imgSrc, false, {
						uploadId: loader.id
					} );

					// This id will be converted into widget data by widget#init method. Once that's done the core widget
					// upload feature will take care of keeping track of the loader.
					widgetElement.data( 'cke-upload-id', loader.id );
					widgetElement.replace( img );
				}
			}

			data.dataValue = temp.getHtml();
		} );
	}

	function loadStyles( editor, plugin ) {
		if ( !stylesLoaded ) {
			CKEDITOR.document.appendStyleSheet( plugin.path + 'styles/easyimage.css' );
			stylesLoaded = true;
		}

		if ( editor.addContentsCss ) {
			editor.addContentsCss( plugin.path + 'styles/easyimage.css' );
		}
	}

	/**
	 * Namespace providing a set of helper functions for Easy Image plugin.
	 *
	 * @since 4.8.0
	 * @singleton
	 * @class CKEDITOR.plugins.easyimage
	 */
	CKEDITOR.plugins.easyimage = {
		/**
		 * Converts response from the server into proper `[srcset]` attribute.
		 *
		 * @since 4.8.0
		 * @private
		 * @param {Object} srcs Sources list to be parsed.
		 * @returns {String} `img[srcset]` attribute.
		 */
		_parseSrcSet: function( srcs ) {
			var srcset = [],
				src;

			for ( src in srcs ) {
				if ( src === 'default' ) {
					continue;
				}

				srcset.push( srcs[ src ] + ' ' + src + 'w' );
			}

			return srcset.join( ', ' );
		}
	};

	CKEDITOR.plugins.add( 'easyimage', {
		requires: 'imagebase,balloontoolbar,button,dialog,cloudservices',
		lang: 'en',
		icons: 'easyimagefull,easyimageside,easyimagealt,easyimagealignleft,easyimagealigncenter,easyimagealignright', // %REMOVE_LINE_CORE%
		hidpi: true, // %REMOVE_LINE_CORE%

		onLoad: function() {
			CKEDITOR.dialog.add( 'easyimageAlt', this.path + 'dialogs/easyimagealt.js' );
		},

		init: function( editor ) {
			loadStyles( editor, this );
		},

		// Widget must be registered after init in case that link plugin is dynamically loaded e.g. via
		// `config.extraPlugins`.
		afterInit: function( editor ) {
			var styles = getStylesForEditor( editor );

			registerWidget( editor, styles );
			addPasteListener( editor );
			addCommands( editor, styles );
			addButtons( editor, styles );
			addContextMenuItems( editor );
			addToolbar( editor );
		}
	} );

	/**
	 * A CSS class applied to all Easy Image widgets. If set to `null` all `<figure>` elements are converted into widgets.
	 *
	 *		// Changes the class to "my-image".
	 *		config.easyimage_class = 'my-image';
	 *
	 *		// This will cause plugin to convert any figure into a widget.
	 *		config.easyimage_class = null;
	 *
	 * @since 4.8.0
	 * @cfg {String/null} [easyimage_class='easyimage']
	 * @member CKEDITOR.config
	 */
	CKEDITOR.config.easyimage_class = 'easyimage';

	/**
	 * Custom styles that could be applied to Easy Image widget.
	 * All styles must be [valid style definitions](#!/guide/dev_howtos_styles-section-how-do-i-customize-the-styles-drop-down-list%3F).
	 * There are three additional properties for each style definition:
	 *
	 * * `label` - string used as a button label in a balloon toolbar for the widget,
	 * * `icon` - path to the icon used in the balloon toolbar,
	 * * `iconHiDpi` - path to the high DPI version of the icon.
	 *
	 * Every style added by this config variable will result in adding `Easyimage<name>` button
	 * and `easyimage<name>` command, where `<name>` is name of style in pascal case, e.g. `left`
	 * style would produce `EasyimageLeft` button and `easyimageLeft` command.
	 *
	 *		config.easyimage_styles = {
	 *			left: {
	 *				attributes: {
	 *					'class': 'left'
	 *				},
	 *				label: 'Align left',
	 *				icon: '/foo/bar/icons/baz.png',
	 *				iconHiDpi: '/foo/bar/icons/hidpi/baz.png'
	 *			}
	 *		};
	 *
	 * @since 4.9.0
	 * @cfg {Object.<String, Object>} easyimage_styles
	 * @member CKEDITOR.config
	 */
	CKEDITOR.config.easyimage_styles = {};


	/**
	 * the default style to be applied to Easy Image widgets, based on keys in {@link #easyimage_styles}.
	 *
	 * If set to `null` no default style is applied.
	 *
	 *		// Make side image a default style.
	 *		config.easyimage_defaultStyle = 'side';
	 *
	 * @since 4.9.0
	 * @cfg {String/null} easyimage_defaultStyle
	 * @member CKEDITOR.config
	 */
	CKEDITOR.config.easyimage_defaultStyle = 'full';

	/**
	 * List of buttons to be displayed in a balloon toolbar for Easy Image widget.
	 * If Context Menu plugin is enabled, this config variable will be used also to add
	 * items to the context menu for Easy Image widget.
	 *
	 *		// Change toolbar to alignment commands.
	 *		config.easyimage_toolbar = [ 'EasyimageAlignLeft', 'EasyimageAlignCenter', 'EasyimageAlignRight' ];
	 *
	 * @since 4.9.0
	 * @cfg {String[]/String} [easyimage_toolbar=[ 'EasyimageFull', 'EasyimageSide', 'EasyimageAlt' ]]
	 * @member CKEDITOR.config
	 */
	CKEDITOR.config.easyimage_toolbar = [ 'EasyimageFull', 'EasyimageSide', 'EasyimageAlt' ];
}() );
