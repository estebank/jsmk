(function() {
	window.jsmk = window.jsmk || {};
	
	jsmk.AnimationSequence = function(frames) {
		frames = frames || [];
		
		this.getFrameCount = function() {
			return frames.length;
		};
		
		this.getFrame = function( frameNumber ) {
			return frames[frameNumber];
		};
		
		this.createAnimation = function() {
			return new jsmk.Animation(this);
		};
	};
	
	jsmk.Animation = function( sequence ) {
		var currentFrame = 0;
		var frameCount = sequence.getFrameCount();
		
		this.nextFrame = function() {
			currentFrame = (currentFrame + 1)%frameCount;
		};
		
		this.reset = function() {
			currentFrame = 0;
		};
		
		this._getFrame = function() {
			return sequence.getFrame(currentFrame);
		};
		
		this.render = function(target) {
			var frame = this._getFrame();
			target.drawImage(frame, 0, 0, frame.width, frame.height);
		};
	};
}());

(function() {
	window.jsmk = window.jsmk || {};

	jsmk.RenderableObjectsRegistry = function( layersOrder ) {
		var layers = {};
		
		this.register = function( layerName, target ) {
			layers[layerName] = layers[layerName] || [];
			layers[layerName].push(target);
		};
		
		this.doRender = function( target ) {
			for(var i in layersOrder) {
				var layerName = layersOrder[i];
				var layer = layers[layerName] || [];
				for(var i in layer) {
					var renderable = layer[i];
					
					renderable.nextFrame();
					renderable.render(target);
				}
			}
		};
	};
}());

(function() {
	window.jsmk = window.jsmk || {};

	jsmk.RenderingContext = function( options ) {
		var lastFrameTime = 0;
		var newFrameHandlers = [];
		
		function triggerNewFrame() {
			for(var i in newFrameHandlers) {
				newFrameHandlers[i]();
			}
		}
		
		function renderLoop(currentFrameTime) {
			webkitRequestAnimationFrame(renderLoop);
			
			var scheduledFrameTime = lastFrameTime + (options && 1000 / options.fps || 0);
			if( currentFrameTime > scheduledFrameTime ) {
				triggerNewFrame();
				lastFrameTime = currentFrameTime;
			}
		};
		
		this.start = function() {
			renderLoop(0);
		};
		
		this.onNewFrame = function( handler ) {
			newFrameHandlers.push(handler);
		};
	};
}());

(function() {
	window.jsmk = window.jsmk || {};
	
	var AVAILABLE_PROJECTIONS = {
		"mirror-x": {
			drawImage: function( target, data, element, positionX, positionY, width, height ) {
				target.context.translate(width, 0);
				target.context.scale(-1,1);
				
				target.drawImage(element, positionX * -1, positionY, width, height);
				
				target.context.scale(-1,1);
				target.context.translate(-width, 0);
			}
		},
		
		"mirror-y": {
			drawImage: function( target, data, element, positionX, positionY, width, height ) {
				target.context.translate(0, height);
				target.context.scale(1,-1);
				
				target.drawImage(element, positionX, positionY * -1, width, height);
				
				target.context.scale(1,-1);
				target.context.translate(0, -height);
			}
		},
		
		"scale": {
			drawImage: function( target, data, element, positionX, positionY, width, height ) {
				var factor = data.factor;
				
				target.context.scale(factor, factor);
				target.drawImage(element, positionX/factor, positionY/factor, width, height);
				target.context.scale(1/factor, 1/factor);
			}
		}
	};
	

	jsmk.RenderTarget = function( context ) {
		this.context = context;
		var self = this;
		
		var ProjectedRenderTarget = function( projections ) {
			//Access to base object
			var _super = self;
			
			//Copy of projections stack
			projections = [].concat(projections);
			
			this.drawImage = function( element, positionX, positionY, width, height ) {

				if(projections.length === 0) {	//No projections pending to apply
					_super.drawImage(element, positionX, positionY, width, height);
				} else {									//Apply more projections until cleaning stack
					var projectionKey = projections.pop();
					var projectionData = projectionKey.data;
					
					var projection = AVAILABLE_PROJECTIONS[projectionKey.name];
					if(!projection) {	//Go to next projection in stack
						this.drawImage(element, positionX, positionY, width, height);
					} else {				//Apply projection and go to next projection in stack
						projection.drawImage(this, projectionData, element, positionX, positionY, width, height);
					}
					
					projections.push(projectionKey.name);
				}
			};
		};
		
		//Extend the original target with additional methods
		ProjectedRenderTarget.prototype = this;


		this.clear = function() {
			context.clearRect(0,0,context.canvas.width, context.canvas.height);
		};
		
		this.drawImage = function( element, positionX, positionY, width, height ) {
			context.drawImage(element, positionX, positionY, width, height);
		};
		
		this.project = function( projectionsMap ) {
			var projections = [];
			for(var name in projectionsMap) {
				projections.push({
					name: name,
					data: projectionsMap[name]
				});
			}
			
			return new ProjectedRenderTarget(projections);
		}
	};
}());