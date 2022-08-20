/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */

// https://marian-caikovski.medium.com/do-not-waste-users-time-on-rendering-off-screen-content-eed17636e7a7

import { html, css } from 'lit';

class EpaperRenderer {
  static get BOLD_MASK ()       { return 0x01; }
  static get ITALIC_MASK ()     { return 0x02; }
  static get UNDERLINE_MASK ()  { return 0x04; }
  static get STRIKEOUT_MASK ()  { return 0x08; }

  constructor () {
    this._debug      = false;
    this._useRecyle  = false;
    this._useClasses = true;

    if ( this._useClasses ) {
      this._styleMap = new Set();
      this._styles   = [];
    }

    this._resetRender();

    this.recycledNodes = 0;
    this.newNodes = 0;
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

  _updateShapeStyle () {
    if ( this._useClasses ) {
      this._currentLineClass = `L-${this._strokeColor.substring(1)}-${this._strokeWidth}`;
      if (! this._styleMap.has(this._currentLineClass)) {
        this._styleMap.add(this._currentLineClass);
        this._styleSheet.insertRule(`
          .${this._currentLineClass} {
            stroke:${this._strokeColor};
            stroke-width:${this._strokeWidth}
          }
        `);
      }
    } else {
      this._currentLineStyle  = `stroke:${this._strokeColor};stroke-width:${this._strokeWidth}`;
    }
    this._currentShapeStyle = `fill:${this._fillColor}`;
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

  _updateTextStyle () {
    if ( this._useClasses ) {
      this._currentTextClass = `T1-${this._fontSize}-${this._textColor.substring(1)}-${this._fontMask}`; // TODO font idx ??? T1 => Tx
      if ( !this._styleMap.has(this._currentTextClass) ) {
        this._styleMap.add(this._currentTextClass);
        this._styleSheet.insertRule(`
          .${this._currentTextClass} {
            font-family: ${this._font};
            font-size: ${this._fontSize}px;
            fill: ${this._textColor};
            font-weight: ${this._fontMask & EpaperRenderer.BOLD_MASK ? 'bold' : 'normal'}
          }
        `);
      }
    } else {
      this._currentTextStyle = `font-family: ${this._font}; font-size: ${this._fontSize}px; fill: ${this._textColor};font-weight: ${this._fontMask & EpaperRenderer.BOLD_MASK ? 'bold' : 'normal'}`;
    }
  }
}


class EpaperSvgRenderer extends EpaperRenderer {

  constructor () {
    super();
    if ( this._recyle ) {
      this._nodeCache = new Map();
      this._nodeCache.set('g', []);
      this._nodeCache.set('line', []);
      this._nodeCache.set('rect', []);
      this._nodeCache.set('text', []);
    }
  }

  _recyle (node) {
    //console.time('recycle');
    while (node.hasChildNodes()) {
      this._recyleNode(node.firstChild);
    }
    //console.timeEnd('recycle');
  }

  _recyleNode (node) {
    while ( node.hasChildNodes() ) {
      this._recyleNode(node.firstChild);
    }
    const rm = node.parentNode.removeChild(node);
    if ( rm.tagName ) {
      const list = this._nodeCache.get((rm.tagName));
      if (list) {
        list.push(rm);
      } else {
        console.log('missing list for', rm);
      }
    }
  }

  create (tag) {
    if ( this._useRecyle   ) {
      const list = this._nodeCache.get(tag);
      if ( list ) {
        const node = list.pop();
        if ( node ) {
          this.recycledNodes++;
          return node;
        }
      }
    }
    this.newNodes++;
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  renderPage (page) {

    //console.time('render');
    if ( page === undefined ) {
      if ( this._page === undefined ) {
        return;
      }
      page = this._page;
    } else {
      this._page = page;
    }

    const p = page.p;

    //this._svg.replaceChildren(); // recycle ?
    // start of a new SVG
    this._resetRender();
    const svg = this.create('svg');
    svg.setAttribute('viewBox', `0 0 ${p.w} ${p.h}`);
    svg.setAttribute('class', 'ilcanvas');
    this._bg = this.create('g');
    svg.appendChild(this._bg);
    this._fg = this.create('g');
    svg.appendChild(this._fg);

    if ( false && this._debug ) {
      const r = this.create('rect');
      r.setAttribute('x', p.ml);
      r.setAttribute('y', p.mt);
      r.setAttribute('width', p.w - p.ml - p.mr);
      r.setAttribute('height', p.h - p.mt - p.mb);
      r.setAttribute('class', 'debug-margin');
      svg._bg.appendChild(r);
    }

    for (const band of page.e) {
      this.renderBand(band, page);
    }

    this._holder.replaceChildren(svg);

    if ( this._useRecyle ) {
      this._recyle(this._svg);
    }
    this._svg = svg;
    //console.timeEnd('render');
    return svg;
  }

  renderBand (band, page) {
    const p = band.p;
    const r = this.create('rect');
    r.setAttribute('x', 0);
    r.setAttribute('y', p.oy);
    r.setAttribute('width', page.p.w);
    r.setAttribute('height', p.h);
    r.setAttribute('class', 'band');
    this._bg.appendChild(r);

    for (const elem of band.e) {
      this.renderElement(elem);
    }
  }

  renderElement (element) {
    if ( element.e ) {
      for ( const elem of element.e ) {
        this.renderElement(elem);
      }
    }
    const p = element.p;

    if ( element.b ) {
      for (const elem of element.b.e) {
        this.renderElement(elem);
      }
    }

    switch ( element.t ) {
      case 'T':
        this._updateTextProps(p);
        if ( element.ts ) {
          for (const s of element.ts) {
            const t = this.create('text');
            t.setAttribute('x', s.x);
            t.setAttribute('y', s.y);
            if ( this._useClasses ) {
              t.setAttribute('class', this._currentTextClass);
            } else {
              t.setAttribute('style', this._currentTextStyle);
            }
            t.textContent = s.t;
            this._bg.appendChild(t);
          }
        }
        break;
      case 'L':
        this._updateShapeProps(p);
        const l = this.create('line');
        l.setAttribute('x1', p.x1);
        l.setAttribute('x2', p.x2);
        l.setAttribute('y1', p.y1);
        l.setAttribute('y2', p.y2);
        if ( this._useClasses ) {
          l.setAttribute('class', this._currentLineClass);
        } else {
          l.setAttribute('style', this._currentLineStyle);
        }
        this._fg.appendChild(l);
        break;
      case 'R':
        this._updateShapeProps(p);
        const r = this.create('rect');
        r.setAttribute('x', p.x);
        r.setAttribute('y', p.y);
        r.setAttribute('width', p.w);
        r.setAttribute('height', p.h);
        r.setAttribute('style', this._currentShapeStyle);
        this._bg.appendChild(r);
        break;
      default:
        console.log(element.t);
        break;
    }

    if ( element.f ) {
      for (const elem of element.f.e) {
        this.renderElement(elem);
      }
    }
  }
}

class CasperEpaperLit extends LitElement {

  static styles = css`

    :host {
      display: flex;
    }

    .ilfondo {
      background-color: #ccc;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .ilcanvas {
      width: 595px;
      height: 842px;
      background-color: white;
      place-self: center;
    }

    .debug-margin {
      fill: none;
      stroke: red;
      stroke-width: 1;
    }

    .band {
      fill: #fff0;
    }

    .band:hover {
      fill: #0002;
    }

  `;

  //***************************************************************************************//
  //                                ~~~ LIT life cycle ~~~                                 //
  //***************************************************************************************//

  render () {

    return html`
      <div id="ilfondo" class="ilfondo">
        <svg id="ilsvg" class="ilcanvas">
        </svg>
      </div>
    `;
  }

  firstUpdated (changedProperties) {
    //this._epaper = this.shadowRoot.getElementById('epaper');
    // temporary plumbing for sandbox
    this._svgRenderer = new EpaperSvgRenderer();
    //this._epaper.$.serverDocument._svgRenderer = this._svgRenderer;
    this._svgRenderer._svg    = this.shadowRoot.getElementById('ilsvg');
    this._svgRenderer._holder = this.shadowRoot.getElementById('ilfondo');
    //this._svgRenderer._styleSheet = new CSSStyleSheet();
    if (this.shadowRoot.adoptedStyleSheets) {
      this._svgRenderer._styleSheet = this.shadowRoot.adoptedStyleSheets[0];
    } else {
      this._svgRenderer._styleSheet = this.shadowRoot.styleSheets[0];
    }
    //this.shadowRoot.adoptedStyleSheets.push(this._svgRenderer._styleSheet); // = [...this.shadowRoot.adoptedStyleSheets, this._svgRenderer._styleSheet];
  }

  //***************************************************************************************//
  //                             ~~~ internal methods ~~~                                  //
  //***************************************************************************************//

}

customElements.define('casper-epaper-lit', CasperEpaperLit);
