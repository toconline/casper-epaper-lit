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

  `;

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
    this.shadowRoot.replaceChildren(CasperEpaperPage.svgRenderer.renderPage(page, this._styleSheet));
    this.style.width  = page.p.w * zoom + 'px';
    this.style.height = page.p.h * zoom + 'px';
    this._svg   = this.shadowRoot.querySelector('svg');
    this._bands = this.shadowRoot.querySelectorAll('.detail');
  }

  renderSvgTooltips (tooltips) {
    const svg = this.shadowRoot.querySelector('svg');
    if ( svg ) {
      const group = CasperEpaperPage.svgRenderer.renderTooltips(svg, tooltips);
      const old   = this.shadowRoot.getElementById('tt-layer');
      svg.replaceChild(group, old);
    }
  }

  mouseMove (event) {
    return;
    if ( this._svg ) {
      let p = this._svg.createSVGPoint();
      p.x = Math.floor(event.clientX);
      p.y = Math.floor(event.clientY);
      p   = p.matrixTransform(this._svg.getScreenCTM().inverse());
      console.log(`in svg coords x=${p.x} y=${p.y}`);
      for (const band of this._bands ) {
        if ( p.checkEnclosure(band) ) {
          band.classList.add('hover-detail');
        }
      }
    }
  }

}

customElements.define('casper-epaper-page', CasperEpaperPage);