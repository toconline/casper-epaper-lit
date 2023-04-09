/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */

// https://marian-caikovski.medium.com/do-not-waste-users-time-on-rendering-off-screen-content-eed17636e7a7

export class EpaperRenderer {
  static get BOLD_MASK ()       { return 0x01; }
  static get ITALIC_MASK ()     { return 0x02; }
  static get UNDERLINE_MASK ()  { return 0x04; }
  static get STRIKEOUT_MASK ()  { return 0x08; }

  static _imageCache;

  constructor () {
    this._debug    = false;
    this._styleMap = new Set();
    this._styles   = [];
    this._resetRender();
    EpaperRenderer._imageCache = EpaperRenderer._imageCache || new Map();
  }

  _resetRender () {
    this._fillColor  = '#FFFFFF';
    this._textColor  = '#000000';
    this._fontSize   = 10;
    this._fontMask   = 0;
    this._font       = 'DejaVu Sans Condensed';

    this._shapeStyle  = 'S'; // TODO Check 
    this._fillColor   = '#FFFFFF';
    this._strokeWidth = 1.0;
    this._strokeColor = '#000000';

    //this._updateTextStyle();
  }

  _updateShapeProps (props) {
    if ( props.st !== undefined ) { // <s><t>yle
      this._shapeStyle = props.st; // F, S, C<lear> P
    }
    if ( props.fc !== undefined ) { // <f>ill <c>olor
      this._fillColor = props.fc;
    }
    if ( props.sw !== undefined ) { // <s>troke <w>idth
      this._strokeWidth = props.sw;
    }
    if ( props.sc !== undefined ) { // <s>troke <c>olor
      this._strokeColor = props.sc;
    }
    this._updateShapeStyle();
  }


  _updateTextProps (props) {

    if ( props.fn !== undefined ) {
      this._font = props.fn;
    }
    if ( props.fs !== undefined ) {
      this._fontSize = props.fs;
    }
    if ( props.tc !== undefined ) {
      this._textColor = props.tc;
    }
    if ( props.fm !== undefined ) {
      this._fontMask  = props.fm;
    }
    this._updateTextStyle();
  }

  /*
  /* === 'R' Rectangle R[S|F|P|C]<x>,<y>,<w>,<h> 
    S -> Stroke
    F -> Fill
    P -> Path ( Stroke + Fill )?
    C -> Clear
  */

  _scaleImage (img_info, img) {
    let max_image_width  = img_info._r - img_info._l;
    let max_image_height = img_info._b - img_info._t;

    let s_x = -1;
    let s_y = -1;
    let s_w = img.naturalWidth;
    let s_h = img.naturalHeight;

    let f_x = 1;
    let f_y = 1;
    let t_w = max_image_width;
    let t_h = max_image_height;

      // calculate scale to apply
      switch(img_info._m) {
        case 'CL':
          // Only the portion of the image that fits the specified object width and height will be printed. Image is not stretched.
          t_w = Math.min(max_image_width, img.naturalWidth);
          t_h = Math.min(max_image_height, img.naturalHeight);
          s_w = t_w;
          s_h = t_h;
          break;
  
        case 'FF':
          // Image will be stretched to adapt to the specified object width and height.
          f_x = max_image_width / img.naturalWidth;
          f_y = max_image_height / img.naturalHeight;
          t_w /= f_x;
          t_h /= f_y;
          break;
  
        case 'RS':
          // Image will adapt to the specified object width or height keeping its original shape.
          f_x = f_y = Math.min(max_image_width / img.naturalWidth, max_image_height / img.naturalHeight);
          t_w = Math.min(img.naturalWidth  * f_x, max_image_width);
          t_h = Math.min(img.naturalHeight * f_x, max_image_height);
          break;
  
        case 'RH':
          // A scale image type that instructs the engine to stretch the image height to fit the actual height of the image.
          // If the actual image width exceeds the declared image element width, the image is proportionally stretched to fit the declared width.
          if ( img.naturalWidth <= max_image_width && img.naturalHeight <= max_image_height ) {
              f_x = f_y = Math.min(max_image_width / img.naturalWidth, max_image_width / img.naturalHeight);
          } else if ( sk_bitmap.width() > img.naturalHeight ) {
              f_x = max_image_width / img.naturalWidth;
              f_y = Math.min(max_image_height / img.naturalHeight, f_x);
          } else {
              f_y = max_image_height / img.naturalHeight;
              f_x = Math.min(max_image_width / sk_bitmap.width(), f_y);
          }
          t_w = img.naturalWidth  * f_x;
          t_h = img.naturalHeight * f_y;
          break;
  
        default:
          // return? invalidate?
          break;
      }
  
      // calculate x-position
      let x;
      if ( img_info._h === 'R' ) {
        x   = img_info._r - t_w;
        s_x = s_w - t_w;
      } else if ( img_info._h === 'C' ) {
        if ( t_w < max_image_width ) {
          s_x = 0;
          x   = img_info._l + (max_image_width - t_w ) / 2;
        } else {
          s_x = (img.naturalWidth - t_w) / 2;
          x   = img_info._l;
        }
      } else { /* left */
        x   = img_info._l;
        s_x = 0;
      }
  
      // calculate y-position
      let y;
      if ( img_info._v === 'B' ) {
        y   = ( b - 0 /*a_image->bottom_pen_.width_*/ ) - t_h;
        s_y = b - t_h;
      } else if ( img_info._v === 'M' ) {
        // TODO REVIEW THIS
        y   =  img_info._t  + ( ( max_image_height - t_h ) / 2 );
        s_y = ( img_info/ 2 ) - ( t_h / 2 );
      } else { /* top */
        y   = img_info._t;
        s_y = 0;
      }
//      this.__canvasContext.drawImage(img, s_x, s_y, s_w, s_h, x, y, t_w, t_h);
    }
}
