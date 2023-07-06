/*
  - Copyright (c) 2014-2023 Cloudware S.A. All rights reserved.
  -
  - This file is part of casper-epaper.
  -
  - casper-epaper is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - casper-epaper  is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with casper-epaper.  If not, see <http://www.gnu.org/licenses/>.
  -
 */

import { LitElement } from 'lit';

export class CasperEpaperWidget extends LitElement {

  static get properties() {
    return {
      /**
       * The icon's name.
       *
       * @type {String}
       */
      overlay: {
        type: String,
        reflect: true
      }
    };
  }

  constructor () {
    super();
    this.overlay  = 'closed'; 
    this._binding = undefined;
    this._visible = false;
  }

  async attach (binding) {
    this._binding = binding;
    this.position();
    this.style.display = 'flex';
    this.requestUpdate();
    await this.updateComplete;
    this.grabFocus();
  }

  detach () {
    this.style.display = 'none';
    // no need to update invisible shit this.requestUpdate();
    if ( this.overlay === 'open' ) {
      this._overlay?.hidePopover();
      this.overlay = 'closed';
    }
  }

  position () {
    const zoom = this.epaper.zoom;
    this.style.left = '0px';
    this.style.top  = '0px';
    this.style.width = this._binding.p.w + 'px';
    this.style.height = this._binding.p.h + 'px';
    this.style.transformOrigin = 'top left';
    this.style.transform = `scale(${zoom}) translate(${this._binding.p.x}px,${this._binding.p.y}px)`;
  }

  _toogleOverlay (event) {
    if ( this.overlay === 'open' ) {
      this.overlay = 'closed';
      this._overlay?.hidePopover(event);
    } else {
      this.overlay = 'open';
      this._textArea.value = undefined;
      this._overlay?.showPopover(event);
    }
    this._textArea.focus();
    event.stopPropagation();
  }

  hideOverlays (hideButtons) {
    //this.hideTooltip();
    // TODO this.$.combo.setVisible(false);
    //this.$.date.setVisible(false);
    if (hideButtons) {
    }
  }

  grabFocus () {
    // to nothing if don't know what to do 
  }

  /*****************************************************************************************/
  /*                                                                                       */
  /*                             ~~~ Input helper functions ~~~                            */
  /*                                                                                       */
  /*****************************************************************************************/

}
