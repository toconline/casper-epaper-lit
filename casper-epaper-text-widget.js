/*
  - Copyright (c) 2014-2019 Cloudware S.A. All rights reserved.
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

import { css, html } from 'lit';
import { CasperEpaperLit } from './casper-epaper-lit.js'
import { CasperEpaperWidget } from './casper-epaper-widget.js';

export class CasperEpaperTextWidget extends CasperEpaperWidget {

  static styles = css`
    :host {
      display: flex;
      position: absolute;
      background-color: #D9E2F3;
      border-bottom: 3px solid var(--dark-primary-color);
      align-items: center;
    }

    .overlay-icon {
      align-self: flex-center;
      color: var(--dark-primary-color);
      margin: 0px;
      width: 15px;
      height: 15px;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 200ms linear;
    }

    .overlay-icon[overlay=open] {
      transform: rotate(-180deg);
    }

    input {
      position: relative;
      height: 100%;
      width: 100%;
      padding: 0px;
      margin: 0px;
      border: none;
      box-sizing: border-box !important;
      outline: none !important;
      background-color: transparent !important;
    }

    input::selection {
      background: #bcdbc8;
    }`;

  get overlayIcon () {
    return undefined;
  }

  attach (binding) {
    this._value = binding.p.dv;
    super.attach(binding);
  }

  render () {
    return html`<input id="textarea" autocomplete="off" 
      @keydown=${(e) => this._keyDown(e)}
      @keyup=${(e) => this._keyUp(e)}
      @click=${(e) => this._click(e)}></input>
      ${this.overlayIcon ?  
        html`<casper-icon icon="${this.overlayIcon}" 
              class="overlay-icon" overlay="${this.overlay}" @click="${this._toogleOverlay}">
            </casper-icon>` : ''}`;
  }

  /*
    @keyup=${(e)   => this._onKeyUp(e)}
    @input=${(e)   => this._onInput(e)}
    @paste=${(e)   => this._paste(e)
  */

  firstUpdated () {
    this._textArea = this.renderRoot.getElementById('textarea');
  }

  updated () {
    this._textArea.style.fontFamily = this._binding.p.fn;
    this._textArea.style.fontSize   = this._binding.p.fs + 'px'; // fs / this._binding.ratio + 'px';
    this._textArea.style.color      = this._binding.fc;
    // TODO BOLD/ITALIC

    if ( this._value ) {
      this._textArea.value = this._value;
      this._textArea.selectionStart = 0;
      this._textArea.selectionEnd = this._value.length;
      this._initialSelection = true;
    } else {
      this._textArea.value = '';
      this._initialSelection = false;
    }
  }

  async _keyDown (event) {
    const vkey = CasperEpaperLit.keycodeToVkey(event);

    if (this._initialSelection === true || this._textArea.value.length === 0) {
      if (['down', 'up', 'left', 'right'].indexOf(vkey) > -1) {
        event.stopPropagation();
        event.preventDefault();
        if ( this.overlay === 'open' && ['down', 'up'].includes(vkey) ) {
          return;
        }
        await this.epaper.moveCursor(vkey);
        return;
      } else if (['tab', 'shift+tab'].indexOf(vkey) > -1) {
        if (this._initialSelection === true) {
          event.stopPropagation();
          event.preventDefault();
          this._initialSelection = false;
          if (vkey === 'shift+tab') {
            await this.epaper._socket.sendKey(this.epaper._document.serverId, 'tab', 'shift');
          } else {
            await this.epaper._socket.sendKey(this.epaper._document.serverId, vkey);
          }
          return;
        }
      } else if (['enter', 'F2'].indexOf(vkey) > -1) {
        this._textArea.selectionStart = this._textArea.value.length;
        this._textArea.selectionEnd = this._textArea.value.length;
        if (this._initialSelection === true || vkey === 'F2') {
          this._initialSelection = false;
          event.stopPropagation();
          event.preventDefault();
          return;
        }
      } else {
        this._initialSelection = false;
      }
    }

    if (['enter', 'tab', 'shift+tab'].indexOf(vkey) > -1) {
      event.stopPropagation();
      event.preventDefault();
      await this.epaper.setValue(this._textArea.value, vkey);
      return;
    }

    event.stopPropagation();
  }

  _keyUp (event) {
    //const vkey = this._keycodeToVkey(event);
    //console.log(`UP ${vkey}`);
    event.stopPropagation();
  }

  _click (event) {
    //console.log('CLICK');
    event.stopPropagation();
    this._initialSelection = false;
  }

  grabFocus () {
    if ( this._textArea ) {
      if (this._initialSelection === true) {
        this._textArea.selectionStart = 0;
        this._textArea.selectionEnd = this._textArea.value.length;
      }
      this._textArea.focus();
    }
  }

  /*****************************************************************************************/
  /*                                                                                       */
  /*                            ~~~ XXXXX XXXXX XXXXXZ ~~~                                 */
  /*                                                                                       */
  /*****************************************************************************************/

}

window.customElements.define('casper-epaper-text-widget', CasperEpaperTextWidget);