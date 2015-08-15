import angular from 'angular';

export default angular.module("mm.image-cropper", []).directive('mmImageCrop', [function () {
	return {
		restrict : 'E',
		transclude : true,
		scope : {
			cropOptions : '=cropOptions',
			imageOut : '=',
			cropImageSave : '&'
		},
		controller : ['$scope', function ($scope) {
			var editCanvas, viewCanvas, mainCanvas, srcCanvas;
			var editCanvasCtx, viewCanvasCtx, mainCanvasCtx, srcCanvasCtx;
			var image = new Image();
			var watermarkImage = new Image();
			var watermarkRatio = 0;
			var ratio_width;
			var self = this;

			var imageType;
			//size to view the canvas
			$scope.cropOptions = $scope.cropOptions || {};
			$scope.cropOptions.viewSizeWidth = $scope.cropOptions.viewSizeWidth || 480;
			$scope.cropOptions.viewSizeHeight = $scope.cropOptions.viewSizeHeight || 360;
			$scope.cropOptions.viewSizeFixed = $scope.cropOptions.viewSizeFixed || false;
			//no use radio btn create into canvas
			$scope.cropOptions.viewShowFixedBtn = false;
			//if rotate tool show
			if ($scope.cropOptions.viewShowRotateBtn === undefined) {
				$scope.cropOptions.viewShowRotateBtn = true;
			}
			//output size of image
			$scope.cropOptions.outputImageWidth = $scope.cropOptions.outputImageWidth || 0;
			$scope.cropOptions.outputImageHeight = $scope.cropOptions.outputImageHeight || 0;
			if ($scope.cropOptions.outputImageRatioFixed === undefined) {
				$scope.cropOptions.outputImageRatioFixed = true;
			}
			$scope.cropOptions.outputImageType = $scope.cropOptions.outputImageType || "jpeg";
			//if this check the image crop by the original size off image and no resize
			if ($scope.cropOptions.outputImageSelfSizeCrop === undefined) {
				$scope.cropOptions.outputImageSelfSizeCrop = true;
			}
			//show the crop tool use only for crop and crop again one image
			if ($scope.cropOptions.viewShowCropTool === undefined) {
				$scope.cropOptions.viewShowCropTool = true;
			}

			//this is the watermark if is set the watermark tool
			//show after crop
			//watermark type = text or image
			$scope.cropOptions.watermarkType = $scope.cropOptions.watermarkType || 'image';
			//set the image
			$scope.cropOptions.watermarkImage = $scope.cropOptions.watermarkImage || null;
			//set text if type is text
			$scope.cropOptions.watermarkText = $scope.cropOptions.watermarkText || null;
			//settings for the text canvas textfill
			$scope.cropOptions.watermarkTextFillColor = $scope.cropOptions.watermarkTextFillColor || 'rgba(0,0, 0, 0.8)';
			$scope.cropOptions.watermarkTextStrokeColor = $scope.cropOptions.watermarkTextFillColor || 'rgba(255,0, 0, 0.8)';
			$scope.cropOptions.watermarkTextStrokeLineWidth = $scope.cropOptions.watermarkTextStrokeLineWidth || 1;
			$scope.cropOptions.watermarkTextFont = $scope.cropOptions.watermarkTextFont || 'Arial';

			$scope.cropOptions.inModal = $scope.cropOptions.inModal || false;
			this.inModal = $scope.cropOptions.inModal;

			//imageType = "image/jpeg";

			if ($scope.cropOptions.outputImageType === 'jpg') {
				imageType = "image/jpeg";
			}
			if ($scope.cropOptions.outputImageType === 'jpeg') {
				imageType = "image/jpeg";
			}
			if ($scope.cropOptions.outputImageType === 'png') {
				imageType = "image/png";
			}

			var SelectionCrop = function (x, y, w, h) {
				this.x = x; // initial positions
				this.y = y;
				this.w = w; // and size
				this.h = h;

				this.px = x; // extra variables to dragging calculations
				this.py = y;

				this.csize = 6; // resize cubes size
				this.csizeh = 10; // resize cubes size (on hover)

				this.bHow = [false, false, false, false, false]; // hover statuses
				this.iCSize = [this.csize, this.csize, this.csize, this.csize, this.csize]; // resize cubes sizes
				this.bDrag = [false, false, false, false, false]; // drag statuses
				this.bDragAll = false; // drag whole selection

				this.rotateCenter = {};//rotate
				this.rotateCenter.angle = 0.005;  // angle rotation - +
				this.rotateCenter.angleRotate = 1;   // angle rotation static +1 -1
				this.rotateCenter.isrotate = false;  // if rotate click
				this.rotateCenter.r = this.w > this.h ? this.w : this.h;   //r radian of circle
				this.rotateCenter.r = this.rotateCenter.r / Math.PI;
				this.rotateCenter.x = this.x + (this.w / 2);   //x center of bif circle
				this.rotateCenter.sx = this.rotateCenter.x + (this.rotateCenter.r * Math.cos(this.rotateCenter.angle));  //x center of small circle control
				this.rotateCenter.y = this.y + (this.h / 2);    //y center of big circle
				this.rotateCenter.sy = this.rotateCenter.y + (this.rotateCenter.r * Math.sin(this.rotateCenter.angle));  //y center of small circle control

				this.ratioHover = false;
				this.ratioOn = false;
				this.ratioSize = 6;
				this.sizeOutRatio = 0;
				this.watermarkTextSpace = 20;

			};

			//create the ratio btn
			SelectionCrop.prototype.drawRatio = function () {

				//show ratio
				if ($scope.cropOptions.viewShowFixedBtn) {
					//draw the radio label
					//  editCanvasCtx.beginPath();
					editCanvasCtx.lineWidth = 1;
					editCanvasCtx.strokeStyle = "#eee";
					editCanvasCtx.font = "20px Arial";
					editCanvasCtx.fillStyle = '#eee';
					editCanvasCtx.fillText("Ratio", 8, 60);
					editCanvasCtx.beginPath();
					editCanvasCtx.arc(65, 55, this.ratioSize, 0, 2 * Math.PI, false);
					//if is check
					if ($scope.cropOptions.outputImageRatioFixed) {
						editCanvasCtx.fillStyle = 'rgba(51,184, 229, 0.9)';
						editCanvasCtx.fill();
					}
					editCanvasCtx.lineWidth = 3;
					editCanvasCtx.strokeStyle = 'rgba(0,153, 205, 0.8)';
					editCanvasCtx.stroke();
				}
			};

			//create watermark image
			SelectionCrop.prototype.drawWaterMarkImage = function () {

				if (this.w > this.h) {
					this.h = this.w / watermarkRatio;
				} else {
					this.w = this.h * watermarkRatio;
				}

				// draw source image
				editCanvasCtx.drawImage(watermarkImage, this.x, this.y, this.w, this.h);

				// and make it darker
				//draw the rect
				editCanvasCtx.strokeStyle = '#000';
				editCanvasCtx.lineWidth = 2;
				editCanvasCtx.strokeRect(this.x, this.y, this.w, this.h);

				// draw part of original image
				if (this.w > 0 && this.h > 0) {
					editCanvasCtx.drawImage(mainCanvas, this.x, this.y, this.w, this.h, this.x, this.y, this.w, this.h);
					viewCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

					srcCanvasCtx.drawImage(watermarkImage, this.x * ratio_width, this.y * ratio_width, this.w * ratio_width, this.h * ratio_width);
					viewCanvasCtx.drawImage(srcCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
				}

				// draw resize cubes
				editCanvasCtx.fillStyle = 'rgba(119,206, 238, 0.9)';
				editCanvasCtx.fillRect(this.x - this.iCSize[0], this.y - this.iCSize[0], this.iCSize[0] * 2, this.iCSize[0] * 2);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[1], this.y - this.iCSize[1], this.iCSize[1] * 2, this.iCSize[1] * 2);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[2], this.y + this.h - this.iCSize[2], this.iCSize[2] * 2, this.iCSize[2] * 2);
				editCanvasCtx.fillRect(this.x - this.iCSize[3], this.y + this.h - this.iCSize[3], this.iCSize[3] * 2, this.iCSize[3] * 2);

				editCanvasCtx.lineWidth = 1;
				editCanvasCtx.strokeRect(this.x - this.iCSize[0], this.y - this.iCSize[0], this.iCSize[0] * 2, this.iCSize[0] * 2);
				editCanvasCtx.strokeRect(this.x + this.w - this.iCSize[1], this.y - this.iCSize[1], this.iCSize[1] * 2, this.iCSize[1] * 2);
				editCanvasCtx.strokeRect(this.x + this.w - this.iCSize[2], this.y + this.h - this.iCSize[2], this.iCSize[2] * 2, this.iCSize[2] * 2);
				editCanvasCtx.strokeRect(this.x - this.iCSize[3], this.y + this.h - this.iCSize[3], this.iCSize[3] * 2, this.iCSize[3] * 2);
			};

			//create watermark image
			SelectionCrop.prototype.drawWaterMarkText = function () {
				// editCanvasCtx.beginPath();
				editCanvasCtx.font = this.h + "px " + $scope.cropOptions.watermarkTextFont;
				editCanvasCtx.fillStyle = $scope.cropOptions.watermarkTextFillColor;
				editCanvasCtx.fillText($scope.cropOptions.watermarkText, this.x + this.watermarkTextSpace, this.y + this.h - (this.h / 4), this.w - this.watermarkTextSpace - this.watermarkTextSpace);
				//editCanvasCtx.beginPath();
				//editCanvasCtx.lineWidth = $scope.cropOptions.watermarkTextStrokeLineWidth;
				// editCanvasCtx.strokeStyle =  $scope.cropOptions.watermarkTextStrokeColor;
				// editCanvasCtx.stroke();
				// and make it darker
				//draw the rect
				//   editCanvasCtx.beginPath();
				editCanvasCtx.strokeStyle = '#000';
				editCanvasCtx.lineWidth = 2;
				editCanvasCtx.strokeRect(this.x, this.y, this.w, this.h);
				//   editCanvasCtx.closePath();
				// draw part of original image
				if (this.w > 0 && this.h > 0) {
					// editCanvasCtx.drawImage(mainCanvas, this.x, this.y, this.w, this.h, this.x, this.y, this.w, this.h);
					viewCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
					//  srcCanvasCtx.drawImage(watermarkImage, this.x*ratio_width, this.y*ratio_width, this.w*ratio_width,this.h*ratio_width);
					//  srcCanvasCtx.beginPath();
					srcCanvasCtx.lineWidth = $scope.cropOptions.watermarkTextStrokeLineWidth;
					srcCanvasCtx.strokeStyle = $scope.cropOptions.watermarkTextFillColor;
					var fontSize = this.h * ratio_width;
					srcCanvasCtx.font = fontSize + "px " + $scope.cropOptions.watermarkTextFont;
					srcCanvasCtx.fillStyle = $scope.cropOptions.watermarkTextFillColor;
					srcCanvasCtx.fillText($scope.cropOptions.watermarkText, (this.x + this.watermarkTextSpace) * ratio_width, (this.y + this.h - (this.h / 4)) * ratio_width, (this.w - this.watermarkTextSpace - this.watermarkTextSpace) * ratio_width);
					viewCanvasCtx.drawImage(srcCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
				}

				// draw resize cubes
				editCanvasCtx.fillStyle = 'rgba(119,206, 238, 0.9)';
				editCanvasCtx.fillRect(this.x - this.iCSize[0], this.y - this.iCSize[0], this.iCSize[0] * 2, this.iCSize[0] * 2);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[1], this.y - this.iCSize[1], this.iCSize[1] * 2, this.iCSize[1] * 2);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[2], this.y + this.h - this.iCSize[2], this.iCSize[2] * 2, this.iCSize[2] * 2);
				editCanvasCtx.fillRect(this.x - this.iCSize[3], this.y + this.h - this.iCSize[3], this.iCSize[3] * 2, this.iCSize[3] * 2);

				editCanvasCtx.lineWidth = 1;
				editCanvasCtx.strokeRect(this.x - this.iCSize[0], this.y - this.iCSize[0], this.iCSize[0] * 2, this.iCSize[0] * 2);
				editCanvasCtx.strokeRect(this.x + this.w - this.iCSize[1], this.y - this.iCSize[1], this.iCSize[1] * 2, this.iCSize[1] * 2);
				editCanvasCtx.strokeRect(this.x + this.w - this.iCSize[2], this.y + this.h - this.iCSize[2], this.iCSize[2] * 2, this.iCSize[2] * 2);
				editCanvasCtx.strokeRect(this.x - this.iCSize[3], this.y + this.h - this.iCSize[3], this.iCSize[3] * 2, this.iCSize[3] * 2);
			};

			//create the rotate tool
			SelectionCrop.prototype.drawRotate = function () {

				if ($scope.cropOptions.viewShowRotateBtn) {
					this.rotateCenter.r = this.w > this.h ? this.w : this.h;   //r radian of circle
					this.rotateCenter.r = Math.floor(this.rotateCenter.r / Math.PI);
					this.rotateCenter.x = Math.floor(this.x + (this.w / 2));   //x center of bif circle
					this.rotateCenter.sx = Math.floor(this.rotateCenter.x + (this.rotateCenter.r * Math.cos(this.rotateCenter.angleRotate)));  //x center of small circle control
					this.rotateCenter.y = Math.floor(this.y + (this.h / 2));    //y center of big circle
					this.rotateCenter.sy = Math.floor(this.rotateCenter.y + (this.rotateCenter.r * Math.sin(this.rotateCenter.angleRotate)));  //y center of small circle control

					// draw rotate
					editCanvasCtx.beginPath();
					editCanvasCtx.arc(this.rotateCenter.x, this.rotateCenter.y, this.rotateCenter.r, 0, 2 * Math.PI, false);
					editCanvasCtx.lineWidth = 5;
					editCanvasCtx.strokeStyle = "rgba(200,200, 200, 0.5)";
					editCanvasCtx.stroke();
					editCanvasCtx.closePath();

					editCanvasCtx.beginPath();
					editCanvasCtx.arc(this.rotateCenter.x, this.rotateCenter.y, this.rotateCenter.r, 0, this.rotateCenter.angleRotate, false);
					editCanvasCtx.lineWidth = 5;
					editCanvasCtx.strokeStyle = 'rgba(153, 205,0, 0.8)';
					editCanvasCtx.stroke();
					editCanvasCtx.closePath();

					editCanvasCtx.beginPath();
					editCanvasCtx.arc(this.rotateCenter.sx, this.rotateCenter.sy, this.iCSize[4], 0, 2 * Math.PI, false);
					editCanvasCtx.fillStyle = 'rgba(51,184, 229,0.8)';
					editCanvasCtx.fill();
					editCanvasCtx.lineWidth = 5;
					editCanvasCtx.strokeStyle = 'rgba(0, 153,204, 0.6)';
					editCanvasCtx.stroke();
					editCanvasCtx.closePath();

				}

			};

			function determineSelectionBoxWithRatio(corners, draggedCorner, ratio) {
				var height = corners[2].y - corners[0].y;
				var width = corners[1].x - corners[0].x;

				if (draggedCorner === 0) {
					if (height > width / ratio) {
						corners[0].y = corners[3].y - width / ratio;
					} else {
						corners[0].x = corners[3].x - height * ratio;
					}
				} else if (draggedCorner === 1) {
					if (height > width / ratio) {
						corners[0].y = corners[3].y - width / ratio;
					} else {
						corners[3].x = corners[0].x + height * ratio;
					}
				} else if (draggedCorner === 2) {
					if (height > width / ratio) {
						corners[3].y = corners[0].y + width / ratio;
					} else {
						corners[0].x = corners[3].x - height * ratio;
					}
				} else if (draggedCorner === 3) {
					if (height > width / ratio) {
						corners[3].y = corners[0].y + width / ratio;
					} else {
						corners[3].x = corners[0].x + height * ratio;
					}
				}
			}

			function setWidthHeightByCorners(corners, selection) {
				selection.x = corners[0].x;
				selection.y = corners[0].y;
				selection.w = corners[3].x - corners[0].x;
				selection.h = corners[3].y - corners[0].y;
			}

			//create the crop tool
			SelectionCrop.prototype.draw = function () {
				this.sizeOutRatio = $scope.cropOptions.outputImageWidth / $scope.cropOptions.outputImageHeight;

				//check if the  ratio output if fixed to make the changes
				if ($scope.cropOptions.outputImageRatioFixed) {
					var corners = this.corners;
					var draggedCorner = this.draggedCorner;
					if (draggedCorner !== undefined && draggedCorner !== null) {
						determineSelectionBoxWithRatio(corners, draggedCorner, this.sizeOutRatio);
						setWidthHeightByCorners(corners, this);
					}

					if (this.x < 0) {
						this.x = 0;
					}
					if (this.y < 0) {
						this.y = 0;
					}
					if (this.x + this.w > editCanvas.width) {
						this.w = editCanvas.width - this.x;
						this.h = this.w / this.sizeOutRatio;
					}
					if (this.y + this.h > editCanvas.height) {
						this.h = editCanvas.height - this.y;
						this.w = this.h * this.sizeOutRatio;
					}
				} else {
					if (this.x < 0) {
						this.x = 0;
					}
					if (this.y < 0) {
						this.y = 0;
					}
					if (this.x + this.w > editCanvas.width) {
						this.w = editCanvas.width - this.x;
					}
					if (this.y + this.h > editCanvas.height) {
						this.h = editCanvas.height - this.y;
					}
				}

				// and make it darker
				editCanvasCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
				editCanvasCtx.fillRect(0, 0, editCanvasCtx.canvas.width, editCanvasCtx.canvas.height);

				//draw the rect
				editCanvasCtx.strokeStyle = '#fff';
				editCanvasCtx.lineWidth = 2;
				if (editCanvasCtx.setLineDash) { //cause ie10
					editCanvasCtx.setLineDash([5, 2]);
				}
				editCanvasCtx.strokeRect(this.x, this.y, this.w, this.h);
				// draw part of original image
				if (this.w > 0 && this.h > 0) {

					editCanvasCtx.drawImage(mainCanvas, this.x, this.y, this.w, this.h, this.x, this.y, this.w, this.h);
					viewCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
					viewCanvasCtx.drawImage(srcCanvas, this.x * ratio_width, this.y * ratio_width, this.w * ratio_width, this.h * ratio_width, this.x, this.y, this.w, this.h);
				}

				// draw resize cubes
				editCanvasCtx.fillStyle = 'rgba(252, 93, 86, 1)';
				editCanvasCtx.fillRect(this.x - this.iCSize[0] * 1.5 / 2, this.y - this.iCSize[0] * 1.5 / 2, this.iCSize[0] * 1.5, this.iCSize[0] * 1.5);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[1] * 1.5 / 2, this.y - this.iCSize[1] * 1.5 / 2, this.iCSize[1] * 1.5, this.iCSize[1] * 1.5);
				editCanvasCtx.fillRect(this.x + this.w - this.iCSize[2] * 1.5 / 2, this.y + this.h - this.iCSize[2] * 1.5 / 2, this.iCSize[2] * 1.5, this.iCSize[2] * 1.5);
				editCanvasCtx.fillRect(this.x - this.iCSize[3] * 1.5 / 2, this.y + this.h - this.iCSize[3] * 1.5 / 2, this.iCSize[3] * 1.5, this.iCSize[3] * 1.5);
			};

			this.drawScene = function () { // main drawScene function
				//clear and load canvas
				editCanvasCtx.clearRect(0, 0, editCanvasCtx.canvas.width, editCanvasCtx.canvas.height); // clear canvas

				editCanvasCtx.drawImage(image, 0, 0, editCanvasCtx.canvas.width, editCanvasCtx.canvas.height);

				mainCanvasCtx.save();
				srcCanvasCtx.save();
				mainCanvasCtx.clearRect(0, 0, editCanvasCtx.canvas.width, editCanvasCtx.canvas.height);
				srcCanvasCtx.clearRect(0, 0, image.width, image.height);
				mainCanvasCtx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
				srcCanvasCtx.translate(image.width / 2, image.height / 2);

				mainCanvasCtx.drawImage(image, -editCanvas.width / 2, -editCanvas.height / 2, editCanvas.width, editCanvas.height);
				srcCanvasCtx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);

				mainCanvasCtx.restore();
				srcCanvasCtx.restore();
				//if crop tool show after crop the value is false
				if ($scope.cropOptions.viewShowCropTool) {
					theSelection.draw();
					theSelection.drawRotate();
				} else {

					if ($scope.cropOptions.watermarkType === 'image') {
						//chech if water mark image is set
						if ($scope.cropOptions.watermarkImage) {
							theSelection.drawWaterMarkImage();

						} else {
							//draw the image
							viewCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
							viewCanvasCtx.drawImage(srcCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
						}
					}
					if ($scope.cropOptions.watermarkType === 'text') {
						//chech if water mark image is set
						if (angular.isString($scope.cropOptions.watermarkText)) {
							theSelection.drawWaterMarkText();
						} else {
							//draw the image
							viewCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
							viewCanvasCtx.drawImage(srcCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
						}
					}

				}
			};

			//get the canvas for edit
			this.getEditCanvas = function () {
				return editCanvas;
			};

			//get the canvas for view
			this.getViewCanvas = function () {
				return viewCanvas;
			};

			//get the crop image and replace the edit canvas and output the Scope imageOut
			this.getImage = function () {
				if ($scope.cropOptions.viewShowCropTool) {
					var temp_ctx, temp_canvas;
					temp_canvas = document.createElement('canvas');
					temp_ctx = temp_canvas.getContext('2d');

					//fix the ratio if is set
					//else the ratio is auto
					if ($scope.cropOptions.outputImageRatioFixed) {
						temp_canvas.width = $scope.cropOptions.outputImageWidth;
						temp_canvas.height = $scope.cropOptions.outputImageHeight;
					} else {

						if (theSelection.w > theSelection.h) {
							temp_canvas.width = theSelection.w / (theSelection.w / $scope.cropOptions.outputImageWidth);
							temp_canvas.height = theSelection.h / (theSelection.w / $scope.cropOptions.outputImageWidth);

						} else {
							temp_canvas.width = theSelection.w / (theSelection.h / $scope.cropOptions.outputImageHeight);
							temp_canvas.height = theSelection.h / (theSelection.h / $scope.cropOptions.outputImageHeight);

						}
					}

					//if this set then the image out size is from the original image
					if ($scope.cropOptions.outputImageSelfSizeCrop) {
						temp_canvas.width = theSelection.w * ratio_width;
						temp_canvas.height = theSelection.h * ratio_width;
					}

					//draw temp canvas
					temp_ctx.drawImage(srcCanvas, theSelection.x * ratio_width, theSelection.y * ratio_width, theSelection.w * ratio_width, theSelection.h * ratio_width, 0, 0, temp_canvas.width, temp_canvas.height);
					//chance the original image with crop for edit watermark
					$scope.cropOptions.image = temp_canvas.toDataURL(imageType);
					//set to the scope
					$scope.imageOut = $scope.cropOptions.image;
					//close the crop tool
					$scope.cropOptions.viewShowCropTool = false;
				}

			};

			//create the canvas
			editCanvas = document.createElement("canvas");
			editCanvasCtx = editCanvas.getContext('2d');
			viewCanvas = document.createElement("canvas");
			viewCanvasCtx = viewCanvas.getContext('2d');
			mainCanvas = document.createElement("canvas");
			mainCanvasCtx = mainCanvas.getContext('2d');
			//the canvas with full image
			srcCanvas = document.createElement("canvas");
			srcCanvasCtx = srcCanvas.getContext('2d');

			//create the selection
			var theSelection = new SelectionCrop(50, 50, 250, 250);

			//on image load
			image.onload = function () {
				theSelection.rotateCenter.angleRotate = 0; //restore the rotation
				//if no size the size = image size
				if ($scope.cropOptions.outputImageWidth === 0 || $scope.cropOptions.outputImageHeight === 0) {
					$scope.cropOptions.outputImageWidth = image.width;
					$scope.cropOptions.outputImageHeight = image.height;
				}

				//find ratio from canvas view to image
				ratio_width = image.width / $scope.cropOptions.viewSizeWidth;

				if (image.width < image.height) {
					ratio_width = image.height / $scope.cropOptions.viewSizeHeight;
				}

				//set the size
				srcCanvas.width = image.width;
				srcCanvas.height = image.height;

				editCanvas.width = image.width / ratio_width;
				editCanvas.height = image.height / ratio_width;

				viewCanvas.width = editCanvas.width;
				viewCanvas.height = editCanvas.height;

				mainCanvas.width = editCanvas.width;
				mainCanvas.height = editCanvas.height;

				if ($scope.cropOptions.outputImageRatioFixed) {
					var outputRatio = $scope.cropOptions.outputImageWidth / $scope.cropOptions.outputImageHeight;

					if (editCanvas.width / outputRatio < editCanvas.height) {
						theSelection.w = editCanvas.width;
						theSelection.h = theSelection.w / outputRatio;
						theSelection.x = 0;
						theSelection.y = (editCanvas.height - theSelection.h) / 2;
					} else {
						theSelection.h = editCanvas.height;
						theSelection.w = theSelection.h * outputRatio;
						theSelection.x = (editCanvas.width - theSelection.w) / 2;
						theSelection.y = 0;
					}
				} else {
					theSelection.w = editCanvas.width / 2;
					theSelection.x = editCanvas.width / 4;

					theSelection.h = editCanvas.height / 2;
					theSelection.y = editCanvas.height / 4;
				}

				self.drawScene();

			};

			this.theSelection = theSelection;

			var loadImage = function () {

				image.src = $scope.cropOptions.image;

			};
			watermarkImage.onload = function () {
				//if(!$scope.cropOptions.viewShowCropTool){

				watermarkRatio = (watermarkImage.width / watermarkImage.height);
				theSelection.x = editCanvas.width / 4;
				theSelection.y = editCanvas.height / 5;
				theSelection.w = editCanvas.width / 2;
				theSelection.h = (editCanvas.width / 2) / watermarkRatio;
				self.drawScene();
				//}
			};

			var loadWatermarkImage = function () {

				if ($scope.cropOptions.watermarkImage) {
					watermarkImage.src = $scope.cropOptions.watermarkImage;
				} else {
					watermarkImage.src = null;
					self.drawScene();
				}
			};

			$scope.$watch('cropOptions.image', loadImage);
			$scope.$watch('cropOptions.watermarkImage', function (value) {
				if (value) {
					loadWatermarkImage();
				}
			});
			$scope.$watch('cropOptions.watermarkText', function (value) {
				if (value) {
					loadImage();
				}
			});
			//  $scope.$watch('$scope.saveImage');

			$scope.$on('cropImageSave', function () {

				$scope.imageOut = srcCanvas.toDataURL(imageType);
				//      window.open(srcCanvas.toDataURL(imageType).replace(imageType, "image/octet-stream"));
				$scope.cropImageSave()($scope.imageOut);
			});
			$scope.$on('cropImageShow', function () {
				$scope.imageOut = srcCanvas.toDataURL(imageType);

			});

			$scope.$on('cropImage', self.getImage);

			loadImage();

		}]
	};

}]).directive('mmEditCrop', [function () {
	return {
		require : '^mmImageCrop',
		restrict : 'E',
		scope : false,
		link : function (scope, element, attrs, cropCtrl) {
			var iMouseX = 0;
			var iMouseY = 1;
			var myPos;
			var isTouch = false;

			var canvasEdit = cropCtrl.getEditCanvas();

			//find the position of elemen work also with modal
			//fix the offset in firefox and modal
			var findPos = function (obj) {
				obj = obj[0];
				var curleft = 0;
				var curtop = 0;

				if (obj.offsetParent) {
					do {
						curleft += obj.offsetLeft;
						curtop += obj.offsetTop;
					} while (obj = obj.offsetParent); // jshint ignore:line
					return {left : curleft, top : curtop};
				}
			};

			function fixSelectionBoxByMove(selection) {
				if (selection.x < 0) {
					selection.x = 0;
				}
				if (selection.y < 0) {
					selection.y = 0;
				}

				if (selection.x + selection.w > canvasEdit.width) {
					selection.x = canvasEdit.width - selection.w;
				}
				if (selection.y + selection.h > canvasEdit.height) {
					selection.y = canvasEdit.height - selection.h;
				}
			}

			var cubeHovered = false;
			var mousemove = function mousemove(X, Y) {
				var dragRedraw = false;
				var resizeRedraw = false;
				var cubeHoverRedraw = false;

				var draggedCorner = null;
				myPos = findPos(element.children());

				iMouseX = X;
				iMouseY = Y;

				cropCtrl.theSelection.rotateCenter.isrotate = false;
				// in case of drag of whole selector
				if (cropCtrl.theSelection.bDragAll) {
					cropCtrl.theSelection.x = iMouseX - cropCtrl.theSelection.px;
					cropCtrl.theSelection.y = iMouseY - cropCtrl.theSelection.py;
					dragRedraw = true;
					fixSelectionBoxByMove(cropCtrl.theSelection);
				}

				for (var i = 0; i < 5; i++) {
					cropCtrl.theSelection.bHow[i] = false;
					cropCtrl.theSelection.iCSize[i] = cropCtrl.theSelection.csize;
				}

				//ratio hover reset
				cropCtrl.theSelection.ratioHover = false;
				cropCtrl.theSelection.ratioSize = 6;

				var prevHoverState = cubeHovered;

				cubeHovered = false;
				// hovering over resize cubes
				if (iMouseX > cropCtrl.theSelection.x - cropCtrl.theSelection.csizeh && iMouseX < cropCtrl.theSelection.x + cropCtrl.theSelection.csizeh &&
					iMouseY > cropCtrl.theSelection.y - cropCtrl.theSelection.csizeh && iMouseY < cropCtrl.theSelection.y + cropCtrl.theSelection.csizeh) {

					cropCtrl.theSelection.bHow[0] = true;
					cropCtrl.theSelection.iCSize[0] = cropCtrl.theSelection.csizeh;
					cubeHovered = true;
				}
				if (iMouseX > cropCtrl.theSelection.x + cropCtrl.theSelection.w - cropCtrl.theSelection.csizeh && iMouseX < cropCtrl.theSelection.x + cropCtrl.theSelection.w + cropCtrl.theSelection.csizeh &&
					iMouseY > cropCtrl.theSelection.y - cropCtrl.theSelection.csizeh && iMouseY < cropCtrl.theSelection.y + cropCtrl.theSelection.csizeh) {

					cropCtrl.theSelection.bHow[1] = true;
					cropCtrl.theSelection.iCSize[1] = cropCtrl.theSelection.csizeh;
					cubeHovered = true;
				}
				if (iMouseX > cropCtrl.theSelection.x + cropCtrl.theSelection.w - cropCtrl.theSelection.csizeh && iMouseX < cropCtrl.theSelection.x + cropCtrl.theSelection.w + cropCtrl.theSelection.csizeh &&
					iMouseY > cropCtrl.theSelection.y + cropCtrl.theSelection.h - cropCtrl.theSelection.csizeh && iMouseY < cropCtrl.theSelection.y + cropCtrl.theSelection.h + cropCtrl.theSelection.csizeh) {

					cropCtrl.theSelection.bHow[2] = true;
					cropCtrl.theSelection.iCSize[2] = cropCtrl.theSelection.csizeh;
					cubeHovered = true;
				}
				if (iMouseX > cropCtrl.theSelection.x - cropCtrl.theSelection.csizeh && iMouseX < cropCtrl.theSelection.x + cropCtrl.theSelection.csizeh &&
					iMouseY > cropCtrl.theSelection.y + cropCtrl.theSelection.h - cropCtrl.theSelection.csizeh && iMouseY < cropCtrl.theSelection.y + cropCtrl.theSelection.h + cropCtrl.theSelection.csizeh) {

					cropCtrl.theSelection.bHow[3] = true;
					cropCtrl.theSelection.iCSize[3] = cropCtrl.theSelection.csizeh;
					cubeHovered = true;
				}

				if (prevHoverState !== cubeHovered) {
					cubeHoverRedraw = true;
				}

				// in case of dragging of resize cubes
				var iFW, iFH, iFX, iFY;

				if (cropCtrl.theSelection.bDrag[0]) {
					//topleft
					draggedCorner = 0;
					iFX = iMouseX - cropCtrl.theSelection.px;
					iFY = iMouseY - cropCtrl.theSelection.py;
					iFW = cropCtrl.theSelection.w + cropCtrl.theSelection.x - iFX;
					iFH = cropCtrl.theSelection.h + cropCtrl.theSelection.y - iFY;
				}
				if (cropCtrl.theSelection.bDrag[1]) {
					//toprght
					draggedCorner = 1;
					iFX = cropCtrl.theSelection.x;
					iFY = iMouseY - cropCtrl.theSelection.py;
					iFW = iMouseX - cropCtrl.theSelection.px - iFX;
					iFH = cropCtrl.theSelection.h + cropCtrl.theSelection.y - iFY;
				}
				if (cropCtrl.theSelection.bDrag[2]) {
					//botright
					draggedCorner = 3;
					iFX = cropCtrl.theSelection.x;
					iFY = cropCtrl.theSelection.y;
					iFW = iMouseX - cropCtrl.theSelection.px - iFX;
					iFH = iMouseY - cropCtrl.theSelection.py - iFY;
				}
				if (cropCtrl.theSelection.bDrag[3]) {
					//botleft
					draggedCorner = 2;
					iFX = iMouseX - cropCtrl.theSelection.px;
					iFY = cropCtrl.theSelection.y;
					iFW = cropCtrl.theSelection.w + cropCtrl.theSelection.x - iFX;
					iFH = iMouseY - cropCtrl.theSelection.py - iFY;
				}

				if (iFW > cropCtrl.theSelection.csizeh * 2 && iFH > cropCtrl.theSelection.csizeh * 2) {
					cropCtrl.theSelection.w = iFW;
					cropCtrl.theSelection.h = iFH;
					cropCtrl.theSelection.x = iFX;
					cropCtrl.theSelection.y = iFY;

					cropCtrl.theSelection.corners = [];
					cropCtrl.theSelection.corners[0] = {x : iFX, y : iFY};
					cropCtrl.theSelection.corners[1] = {x : iFX + iFW, y : iFY};
					cropCtrl.theSelection.corners[2] = {x : iFX, y : iFY + iFH};
					cropCtrl.theSelection.corners[3] = {x : iFX + iFW, y : iFY + iFH};

					resizeRedraw = true;
				}

				cropCtrl.theSelection.draggedCorner = draggedCorner;

				if (dragRedraw || resizeRedraw || cubeHoverRedraw) {
					cropCtrl.drawScene();
				}

			};

			var mousedown = function (X, Y) {
				myPos = findPos(element.children());

				iMouseX = X;
				iMouseY = Y;

				cropCtrl.theSelection.px = iMouseX - cropCtrl.theSelection.x;
				cropCtrl.theSelection.py = iMouseY - cropCtrl.theSelection.y;

				if (cropCtrl.theSelection.bHow[0]) {
					cropCtrl.theSelection.px = iMouseX - cropCtrl.theSelection.x;
					cropCtrl.theSelection.py = iMouseY - cropCtrl.theSelection.y;
				}
				if (cropCtrl.theSelection.bHow[1]) {
					cropCtrl.theSelection.px = iMouseX - cropCtrl.theSelection.x - cropCtrl.theSelection.w;
					cropCtrl.theSelection.py = iMouseY - cropCtrl.theSelection.y;
				}
				if (cropCtrl.theSelection.bHow[2]) {
					cropCtrl.theSelection.px = iMouseX - cropCtrl.theSelection.x - cropCtrl.theSelection.w;
					cropCtrl.theSelection.py = iMouseY - cropCtrl.theSelection.y - cropCtrl.theSelection.h;
				}
				if (cropCtrl.theSelection.bHow[3]) {
					cropCtrl.theSelection.px = iMouseX - cropCtrl.theSelection.x;
					cropCtrl.theSelection.py = iMouseY - cropCtrl.theSelection.y - cropCtrl.theSelection.h;
				}

				if (cropCtrl.theSelection.ratioHover) {

					cropCtrl.theSelection.ratioOn = !cropCtrl.theSelection.ratioOn;
				}

				if (iMouseX > cropCtrl.theSelection.x + cropCtrl.theSelection.csizeh && iMouseX < cropCtrl.theSelection.x + cropCtrl.theSelection.w - cropCtrl.theSelection.csizeh &&
					iMouseY > cropCtrl.theSelection.y + cropCtrl.theSelection.csizeh && iMouseY < cropCtrl.theSelection.y + cropCtrl.theSelection.h - cropCtrl.theSelection.csizeh) {

					if (!cropCtrl.theSelection.bHow[4]) {
						cropCtrl.theSelection.bDragAll = true;
					}
				}

				for (var i = 0; i < 5; i++) {
					if (cropCtrl.theSelection.bHow[i]) {
						cropCtrl.theSelection.bDrag[i] = true;
					}
				}
			};

			var mouseUp = function () {
				cropCtrl.theSelection.bDragAll = false;
				for (var i = 0; i < 5; i++) {
					cropCtrl.theSelection.bDrag[i] = false;
				}
				cropCtrl.theSelection.px = 0;
				cropCtrl.theSelection.py = 0;
			};

			document.onmousedown = function (e) {
				var clientRect = canvasEdit.getBoundingClientRect();
				var htmlRect = document.getElementsByTagName("html")[0].getBoundingClientRect();
				mousedown(e.pageX - clientRect.left + htmlRect.left, e.pageY - clientRect.top + htmlRect.top);
			};
			document.onmousemove = function (e) {
				var clientRect = canvasEdit.getBoundingClientRect();
				var htmlRect = document.getElementsByTagName("html")[0].getBoundingClientRect();
				mousemove(e.pageX - clientRect.left + htmlRect.left, e.pageY - clientRect.top + htmlRect.top);
			};
			document.onmouseup = mouseUp;

			element.append(canvasEdit);
		}
	};
}]).directive('mmViewCrop', [function () {
		return {
			require : '^mmImageCrop',
			restrict : 'E',
			scope : false,
			link : function (scope, element, attrs, cropCtrl) {
				element.append(cropCtrl.getViewCanvas());
			}

		};

	}]);
