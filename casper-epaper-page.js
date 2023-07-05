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
      stroke-width: 0.5;
    }

    .debug-line {
      fill: none;
      stroke: #f1f1f1;
      stroke-width: 0.5
    }

    .debug-bounds {
      fill: none;
      stroke: #aed6f1;
      stroke-width: 0.5;
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

    .context-menu {
      display: none;
      position: absolute;
      top: 0;
    }

    .line-menu-button {
      padding: 6px;
      margin-left: 4px;
      max-width: 28px;
      max-height: 28px;
      border-radius: 50%;
      -webkit-box-shadow: 0px 1px 6px -1px rgba(0, 0, 0, 0.61);
      -moz-box-shadow:    0px 1px 6px -1px rgba(0, 0, 0, 0.61);
      box-shadow:         0px 1px 6px -1px rgba(0, 0, 0, 0.61);
    }

    .delete {
      --casper-icon-button-color: white;
      --casper-icon-button-background-color: var(--status-red);
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
      <div id="context-menu" class="context-menu">
        <casper-icon-button icon="fa-light:plus"      class="line-menu-button"        @click="${(e) => this.epaper.addDocumentLine(e, this._currentDetail)}"></casper-icon-button>
        <casper-icon-button icon="fa-light:trash-alt" class="line-menu-button delete" @click="${(e) => this.epaper.removeDocumentLine(e, this._currentDetail)}"></casper-icon-button>
      </div>
    `;
  }

  firstUpdated () {
    if (this.shadowRoot.adoptedStyleSheets) {
      this._styleSheet = this.shadowRoot.adoptedStyleSheets[0];
    } else {
      this._styleSheet = this.shadowRoot.styleSheets[0];
    }
    this._contextMenu = this.shadowRoot.getElementById('context-menu');
    this._svg = this.shadowRoot.querySelector('svg');
  }

  renderAsSvg (page, zoom) {
    this._bands = [];
    this._svg.replaceChildren(CasperEpaperPage.svgRenderer.renderPage(page, this._styleSheet, this._bands));
    this.style.width  = page.p.w * zoom + 'px';
    this.style.height = page.p.h * zoom + 'px';
    //this._svg = this.shadowRoot.querySelector('svg');
  }

  renderSvgTooltips (tooltips) {
    if ( this._svg  ) {
      const group = CasperEpaperPage.svgRenderer.renderTooltips(this._svg, tooltips);
      const old   = this.shadowRoot.getElementById('tt-layer');
      //this._svg.replaceChild(group, old);
    }
  }

  toServerCoordinates (event) {
    let p = new DOMPoint();
    p.x = Math.floor(event.clientX);
    p.y = Math.floor(event.clientY);
    if ( this._svg ) {
      p = p.matrixTransform(this._svg.getScreenCTM().inverse());
    }
    return p;
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
          this._contextMenu.style.display = 'none';
          this._currentDetail = undefined;
        }
      }

      // ... find next active detail band ...
      if ( this._currentDetail === undefined ) {
        const band = this._binaryFindBand(y);
        if ( band !== undefined ) {
          band.r.classList.add('hover-detail');
          this._currentDetail = band;
          if ( this.epaper._document.chapter.editable) {
            this._contextMenu.style.display = 'flex';
            const tx = 575 * this.epaper.zoom;
            const ty = (band.y1 + (band.y2 - band.y1) / 2) * this.epaper.zoom - this._contextMenu.getBoundingClientRect().height / 2 ;
            this._contextMenu.style.transform = `translate(${tx}px,${ty}px)`;
          }
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