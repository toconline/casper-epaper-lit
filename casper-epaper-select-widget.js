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


//import { css, html } from 'lit';
import { CasperEpaperTextWidget } from './casper-epaper-text-widget.js';
//import '@toconline/casper-icons/casper-icon.js';
//import '@toconline/casper-select-lit/casper-select-lit.js';
//import '@toconline/casper-select-lit/components/casper-highlightable.js';

export class CasperEpaperSelectWidget extends CasperEpaperTextWidget {

  get overlayIcon () {
    return 'fa-regular:angle-down';
  }

}

window.customElements.define('casper-epaper-select-widget', CasperEpaperSelectWidget);