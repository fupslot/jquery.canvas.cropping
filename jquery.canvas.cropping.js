(function($) {
	
	var scene = 
	{
		clear:
		function(aCtx)
		{
			if ( config.sceneImage )
			{
				aCtx.clearRect(0, 0, widget.canvasWidth, widget.canvasHeight);
				var w, h;
				w = config.sceneImage.width;
				h = config.sceneImage.height;
				aCtx.drawImage(config.sceneImage, 0, 0, w, h);
			}
		},
		offset:
		function()
		{
			var offset = {top:0, left:0};
			var relativeTo = $(config.relativeTo).position();
			if ( relativeTo != null )
			{
				offset.top  = relativeTo.top;
				offset.left = relativeTo.left;
			}
			return offset;
		},
		clip:
		function()
		{
			var clipped_canvas = document.createElement("canvas");
			clipped_canvas.width  = rect.width;
			clipped_canvas.height = rect.height;

			var ctx = clipped_canvas.getContext("2d");
			ctx.drawImage(config.sceneImage, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

			var dataImage = clipped_canvas.toDataURL();
			var image = new Image();
			image.onload = function()
			{
				var posX, posY;
				posX = (widget.element[0].offsetWidth / 2)  - (rect.width / 2);
				posY = (widget.element[0].offsetHeight / 2) - (rect.height / 2);
				
				//scene.clear(widget.ctx);
				widget.ctx.clearRect(0, 0, widget.canvasWidth, widget.canvasWidth);
				widget.ctx.drawImage(image, posX, posY);

				if ( widget.oncropCB )
				{
					widget.oncropCB(dataImage);
				}
			}
			image.src = dataImage;
		},

		outOfBoundary:
		function(aRect)
		{
			return aRect.x <= 0 || aRect.y <= 0 || aRect.width >= config.sceneImage.width || aRect.height >= config.sceneImage.height;
		},

		minRectSize:
		function(aRect)
		{
			return aRect.width <= config.min_rect_width || aRect.height <= config.min_rect_height;
		},

		fullscreen:
		function()
		{
			mode.fullscreen = !mode.fullscreen;
			if ( mode.fullscreen )
			{
				// save current size
				widget.copyTo(rect, widget.rectState);
				widget.copyTo({x: 0, y: 0, width: config.sceneImage.width, height: config.sceneImage.height}, rect);
			}
			else
			{
				widget.copyTo(widget.rectState, rect);
				widget.rectState = {};
			}
			// redraw the scene
			scene.clear(widget.ctx);
			// clear_scene();
			rect.draw(widget.ctx);
		},

		mouseDown:
		function(x, y)
		{
			widget.dragStart.x = x;
			widget.dragStart.y = y;

			// click on a button
			var button = rect.containButton(x, y);
			if ( button )
			{
				if ( button.onclick ) { button.onclick(); }
				return;
			}
			// click on selecting area
			if (rect.contain(x, y)) {
				mode.dragging = true; //dragging mode
				return;
			}

			widget.capturedEdge = rect.containEdge(x, y);
			if ( widget.capturedEdge )
			{
				mode.expanding = true; //expanding mode
			}
		},

		mouseUp:
		function()
		{
			mode.dragging  = false;
			mode.expanding = false;

			widget.capturedEdge = undefined;
		},

		mouseMove:
		function(x, y)
		{
			var dx = 0, dy = 0;
			if (!mode.fullscreen && ( mode.dragging || mode.expanding ))
			{
				scene.clear(widget.ctx);
				if ( x < widget.dragStart.x ) {
					dx = -(widget.dragStart.x - x);
				}
				else {
					dx = x - widget.dragStart.x;
				}
				if ( y < widget.dragStart.y ) {
					dy = -(widget.dragStart.y - y);
				}
				else {
					dy = y - widget.dragStart.y;
				}
			}
			// make copy of the original object to safety manipulate its properties
			var rectCopy = {};
			widget.copyTo(rect, rectCopy);

			if (!mode.fullscreen && mode.dragging)
			{
				rectCopy.x += dx;
				rectCopy.y += dy;

				widget.dragStart.x += dx;
				widget.dragStart.y += dy;
				// make sute that a user not drag out of the visible area
				if (!this.outOfBoundary(
					{
						x: rectCopy.x,
						y: rectCopy.y,
						width:  rectCopy.x + rectCopy.width,
						height: rectCopy.y + rectCopy.height
					}
				))
				{

					rect.x = rectCopy.x;
					rect.y = rectCopy.y;
					rect.width  = rectCopy.width;
					rect.height = rectCopy.height;
				}
				rect.draw(widget.ctx);
			}

			if ( !mode.fullscreen && mode.expanding )
			{
				// up & left
				if ( widget.capturedEdge.cursor === "nw-resize" )
				{
					rectCopy.x += dx;
					rectCopy.width  -= dx;
					rectCopy.y -=  (rectCopy.width / config.proportion) - rectCopy.height;
					rectCopy.height = rectCopy.width / config.proportion;
				}
				// up & right
				if (widget.capturedEdge.cursor === "ne-resize")
				{
					rectCopy.width += dx;
					rectCopy.y -= (rectCopy.width / config.proportion) - rectCopy.height;
					rectCopy.height = rectCopy.width / config.proportion;
				}
				if ( widget.capturedEdge.cursor === "se-resize" )
				{
					rectCopy.width += dx; 
					rectCopy.height = rectCopy.width / config.proportion;
				}
				// down & left
				if ( widget.capturedEdge.cursor === "sw-resize")
				{
					rectCopy.x += dx;
					rectCopy.width -= dx;
					rectCopy.height = rectCopy.width / config.proportion;
				}
				widget.dragStart.x += dx;
				widget.dragStart.y += dy;
				
				// size of the rectangle cannot be less than the default one
				// and it stays in canvas boundary
				if ( !scene.minRectSize(rectCopy) && !scene.outOfBoundary(rectCopy) )
				{
					widget.copyTo(rectCopy, rect);
				}
				
				rect.draw(widget.ctx);
			}

			rect.setCursor(x, y);
		}

	};

	var rect =
	{
		x: 0,
		y: 0,
		width: 0,
		height: 0,

		edges:
		[
			{x:0, y:0, width:0, height:0, cursor:"nw-resize"},
			{x:0, y:0, width:0, height:0, cursor:"ne-resize"},
			{x:0, y:0, width:0, height:0, cursor:"se-resize"},
			{x:0, y:0, width:0, height:0, cursor:"sw-resize"}
		],

		buttons: [],

		addButton:
		function(button)
		{
			var btn = $.extend({x:0, y:0, width: button.image.width, height: button.image.height}, button);
			this.buttons.push(btn);
		},

		contain:
		function(x, y)
		{
			return (this.x <= x && x <= this.x + this.width) && (this.y <= y && y <= this.y + this.height);
		},

		containEdge:
		function(x, y)
		{
			for (var i = this.edges.length - 1; i >= 0; i--) {
				var edge = this.edges[i];
				if ((edge.x <= x && x <= edge.x + edge.width) && (edge.y <= y && y <= edge.y + edge.height))
				{
					return edge;
				}
			};
		},

		containButton:
		function(x, y)
		{
			for (var i = this.buttons.length - 1; i >= 0; i--) {
				var button = this.buttons[i];
				if ((button.x <= x && x <= button.x + button.width) && (button.y <= y && y <= button.y + button.height))
				{
					return button;
				}
			};
		},

		drawEdges:
		function(aCtx)
		{
			var edgeSize = 10; // square 10px
			
			for (var i = this.edges.length - 1; i >= 0; i--) {
				var edge = this.edges[i];
				// rectangle's edge up and left
				if ( edge.cursor === "nw-resize")
				{
					edge.x = this.x - edgeSize;
					edge.y = this.y - edgeSize;
				}
				// rectangle's edge up and right
				if ( edge.cursor === "ne-resize")
				{
					edge.x = this.x + this.width;
					edge.y = this.y - edgeSize;
				}
				// rectangle's edge down and right
				if ( edge.cursor === "se-resize")
				{
					edge.x = this.x + this.width;
					edge.y = this.y + this.height;
				}
				// rectangle's edge down and left
				if ( edge.cursor === "sw-resize")
				{
					edge.x = this.x - edgeSize;
					edge.y = this.y + this.height;
				}
				edge.width  = edgeSize;
				edge.height = edgeSize;
				
				// draw the edge area
				aCtx.fillStyle = "rgba(0, 0, 0, 0.5)"; // half transparent
				aCtx.fillRect(edge.x, edge.y, edge.width, edge.height);
				aCtx.fill();
			};
		},

		drawButtons:
		function(aCtx)
		{
			// fullscreen button
			var btn = this.buttons[0];
			if ( btn )
			{
				btn.x = (this.x + this.width) - 5 - (btn.width);
				btn.y = this.y + 5;
				aCtx.drawImage(btn.image, btn.x, btn.y, btn.image.width, btn.image.height);
			}

			// apply button
			btn = this.buttons[1];
			if ( btn )
			{
				btn.x = (this.x + this.width) - 5 - btn.width;
				btn.y = (this.y + this.height) - 5 - btn.height;
				aCtx.drawImage(btn.image, btn.x, btn.y, btn.image.width, btn.image.height);
			}
		},

		draw:
		function(aCtx)
		{
			if ( !mode.fullscreen )
			{
				// set shade a background to half transparent
				aCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
				aCtx.fillRect(0, 0, widget.canvasWidth, widget.canvasHeight);
				aCtx.fill();
				aCtx.drawImage(config.sceneImage, this.x, this.y, this.width, this.height, this.x, this.y, this.width, this.height);
				// draw edges
				this.drawEdges(aCtx);
			}
			this.drawButtons(aCtx);
		},

		setCursor:
		function(x, y)
		{
			if ( this.containButton(x, y) )
			{
				widget.element.css("cursor", "pointer");
				return;
			}
			if ( !mode.fullscreen && this.contain(x, y) )
			{
				widget.element.css("cursor", "move");
				return;
			}
			var edge = this.containEdge(x, y);
			if ( !mode.fullscreen && edge )
			{
				widget.element.css("cursor", edge.cursor);
				return;
			}
			widget.element.css("cursor", "default");
		}

	};

	var defaults =
	{
		// image path for scene image
		scene: "coffee.png",

		proportion: 1.9,
		
		min_rect_width: 209,
		min_rect_height: 110,
		
		buttons: {
			fullscreen: {
				image: "fullscreen.png",
				label: "fullscreen"
			},
			apply: {
				image: "apply.png",
				label: "apply"
			}
		},

		// contain element relative to we have to
		// calculate mouse coordinates
		relativeTo: ""

	};

	var widget =
	{
		// canvas element
		element:      undefined,
		canvasWidth:  undefined,
		canvasHeight: undefined,
		ctx:          undefined,

		dragStart: {x:0, y:0},
		capturedEdge: undefined,
		
		// callback, occured when the image
		// successfully cropped
		oncropCB: undefined,

		// this object will keep a rect original size
		// wich make a switching back from a fullscreen is possiable
		rectState: {},

		copyTo:
		function(from, to)
		{
			to.x      = from.x;
			to.y      = from.y;
			to.width  = from.width;
			to.height = from.height;
		}
	};

	var mode =
	{
		dragging: false,
		expanding: false,
		fullscreen: false
	};

	var config;

	var methods = {

		init:
		function(options)
		{
			config = $.extend(
			{
				sceneImage:            undefined,
				fullscreenButtonImage: undefined,
				applyButtonImage:      undefined
			}, defaults, options);

			widget.oncropCB = config.oncrop;

			// this plugin is relevant for CANVAS elements only
			if (widget.element.get(0).tagName !== "CANVAS")
			{
				$.error("This widget works with CANVAS elements only!");
			}
			
			widget.canvasWidth  = widget.element.get(0).width;
			widget.canvasHeight = widget.element.get(0).height;
			widget.ctx = widget.element.get(0).getContext("2d");

			if (!widget.element.data("init"))
			{
				widget.element.mousedown(function(e) {
					var relOffset = scene.offset();
					// console.log("top:%d, left:%d", this.offsetTop, this.offsetLeft);
					var x = e.clientX - relOffset.left - this.offsetLeft;
					var y = e.clientY - relOffset.top  - this.offsetTop;
					// console.log("x:%d, y:%d", x, y);
					scene.mouseDown(x, y);
				})
				.mouseup(function() {
					scene.mouseUp();
				})
				.mousemove(function(e) {
					// console.log("w:%d, h:%d", this.offsetTop, this.offsetLeft);
					var relOffset = scene.offset();
					var x = e.clientX - relOffset.left - this.offsetLeft;
					var y = e.clientY - relOffset.top  - this.offsetTop;
					scene.mouseMove(x, y);
				});
				widget.element.data("init", true);
			}

			resLoad(function() {
				// calculate default selected area
				rect.width  = Math.floor(config.sceneImage.width * 0.66);
				rect.height = rect.width / config.proportion;
				rect.x = Math.floor((config.sceneImage.width - rect.width) / 2);
				rect.y = Math.floor((config.sceneImage.height - rect.height) / 2);

				// add fullscreen button
				rect.addButton({
					image: config.fullscreenButtonImage,
					label: config.buttons.fullscreen.label,
					onclick: scene.fullscreen
				});

				// add apply button
				rect.addButton({
					image: config.applyButtonImage,
					label: config.buttons.apply.label,
					onclick: scene.clip
				});

				// draw scene
				scene.clear(widget.ctx);
				rect.draw(widget.ctx);
			});
		}
	};

	function resLoad(aCallback)
	{
		// load scene image
		config.sceneImage = new Image();
		config.sceneImage.onload = config.sceneImage.onerror = function(e)
		{
			// keep going if the scene image loaded only 
			if (e.type === "load")
			{
				widget.element.attr({
					width: config.sceneImage.width,
					height: config.sceneImage.height
				});
				config.fullscreenButtonImage = new Image();
				config.fullscreenButtonImage.onload = config.fullscreenButtonImage.onerror = function() {
					config.applyButtonImage = new Image();
					config.applyButtonImage.onload = config.applyButtonImage.onerror = function() {
						aCallback();
					}
					config.applyButtonImage.src = config.buttons.apply.image;
				}
				config.fullscreenButtonImage.src = config.buttons.fullscreen.image;
			}
		}
		config.sceneImage.src = config.scene;
	}

	$.fn.cropping = function(method)
	{
		widget.element = this;
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.cropping' );
		} 
	}
			
})(jQuery)