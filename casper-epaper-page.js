/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */

import { html, css, LitElement } from 'lit';
import { EpaperSvgRenderer} from './epaper-svg-renderer.js'

class CasperEpaperPage extends LitElement {

  static svgRenderer = new EpaperSvgRenderer();

  static styles = css`
    :host {
      background-color: white;
    }

    .epaper-svg {
      width: 100%;
      height: 100%;
    }

    .debug-margin {
      fill: none;
      stroke: red;
      stroke-width: 1;
    }

    .detail {
      fill: transparent;
    }

    .hover-detail {
      fill: #ddf8;
    }

    .epaper-link {
      cursor: pointer;
    }

    .epaper-link rect {
      fill: transparent;
    }

    .epaper-link:hover text {
      fill: blue;
      text-decoration: underline;
    }

    .tooltip {
      fill: #fff0;
    }

    .iw {
      fill: #ff0000;
    }

    .it {
      fill: #ffffff;
      font-family: Verdana;
      font-size: 8pt;
    }

  `;

  constructor () {
    super();
    this._auxP = new DOMPoint();     // auxiliary point for mice tracking
    this._currentDetail = undefined; // the detail band that is active
  }

  //***************************************************************************************//
  //                                ~~~ LIT life cycle ~~~                                 //
  //***************************************************************************************//

  render () {
    return html`
      <svg id="svg" class="epaper-svg">
      </svg>
    `;
  }

  firstUpdated () {
    if (this.shadowRoot.adoptedStyleSheets) {
      this._styleSheet = this.shadowRoot.adoptedStyleSheets[0];
    } else {
      this._styleSheet = this.shadowRoot.styleSheets[0];
    }
  }

  renderAsSvg (page, zoom) {
    this._bands = [];
    this.shadowRoot.replaceChildren(CasperEpaperPage.svgRenderer.renderPage(page, this._styleSheet, this._bands));
    this.style.width  = page.p.w * zoom + 'px';
    this.style.height = page.p.h * zoom + 'px';
    this._svg = this.shadowRoot.querySelector('svg');
  }

  renderSvgTooltips (tooltips) {
    if ( this._svg  ) {
      const group = CasperEpaperPage.svgRenderer.renderTooltips(this._svg, tooltips);
      const old   = this.shadowRoot.getElementById('tt-layer');
      this._svg.replaceChild(group, old);
    }
  }

  renderFocusAsSvg (widget) {
    const old = this.shadowRoot.getElementById('iw-layer');

    if ( undefined !== widget.s ) {
      const iw = CasperEpaperPage.svgRenderer.renderInput(this._svg, widget.s);
      this._svg.replaceChild(iw, old);
    }

  }

  mouseMove (event) {
    if ( this._svg ) {
      // ... transform screen coordinates to SVG coordinates ...
      this._auxP.x = Math.floor(event.clientX);
      this._auxP.y = Math.floor(event.clientY);
      const y = this._auxP.matrixTransform(this._svg.getScreenCTM().inverse()).y;

      // ... check if the mouse moved out of the current detail band ...
      if ( this._currentDetail !== undefined ) {
        if ( y < this._currentDetail.y1 || y > this._currentDetail.y2 ) {
          this._currentDetail.r.classList.remove('hover-detail');
          this._currentDetail = undefined;
        }
      }

      // ... find next active detail band ...
      if ( this._currentDetail === undefined ) {
        const band = this._binaryFindBand(y);
        if ( band !== undefined ) {
          band.r.classList.add('hover-detail');
          this._currentDetail = band;
        }
      }
    }
  }

  _binaryFindBand (y) {

    if ( this._bands !== undefined && this._bands.length > 0 ) {
      let mid;
      let min = 0.0;
      let max = this._bands.length - 1;

      while ( min <= max ) {
        mid = Math.floor((min + max) / 2.0);
        if ( y >= this._bands[mid].y1 && y <= this._bands[mid].y2 ) {
          return this._bands[mid]; // found!
        } else if ( this._bands[mid].y1 < y ) {
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }
    }
    return undefined; // Not found!
  }


}

customElements.define('casper-epaper-page', CasperEpaperPage);