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

    .band {
      fill: #fff0;
    }

    .band:hover {
      fill: #0002;
    }

    .epaper-link:hover {
      fill: blue;
      text-decoration: underline;
      cursor: pointer;
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
  }
}

customElements.define('casper-epaper-page', CasperEpaperPage);