/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */

// https://marian-caikovski.medium.com/do-not-waste-users-time-on-rendering-off-screen-content-eed17636e7a7

import { html, css, LitElement } from 'lit';
import '@cloudware-casper/casper-timed-status/casper-timed-status.js';
import './casper-epaper-page.js'

class CasperEpaperLit extends LitElement {

  get MAX_ZOOM () { return 3;   }
  get MIN_ZOOM () { return 0.5; }

  static properties = {
    zoom: {
      type: Number,
      reflect: true
    },
    statusMsg: {
      type: String,
    }
  }

  static styles = css`

    :host {
      position: relative;
      display: flex;
    }

    casper-icon-button {
      width: 32px;
      height: 32px;
      margin-left: 8px;
      box-shadow: 1px 2px 6px -1px rgba(0, 0, 0, 0.6);
      z-index: 3;
    }

    .background {
      position: absolute;
      background-color: #ccc;
      display: flex;
      width: 100%;
      height: 100%;
      flex-direction: column;
      justify-content: center;
      overflow: auto;
    }

    .toolbar {
      top: 0;
      position: absolute;
      padding: 16px;
      display: flex;
      width: 100%;
      box-sizing: border-box;
    }

    .rotate {
      transform: rotate(-90.0deg);
      white-space: nowrap;
    }

    .tab {
      display: flex;
      position: absolute;
      top: 0px;
      justify-content: center;
      align-items: center;
      width: 32px;
      color: white;
      border-radius: 0 0 32px 0;
      transform: translate3d(-100%, 0, 0);
      transition: transform 0.3s ease-out;
      cursor: pointer;
    }

    .tab:hover {
      font-weight: bold;
    }

    .tab-slide {
      transform: translate3d(0%, 0, 0);
      transition: transform 0.5s ease-in;
      box-shadow: 1px 2px 6px -1px rgba(0, 0, 0, 0.6);
      z-index: 3;
    }

    .tab1 {
      height: calc(100% - 48px);
      background-color: var(--primary-color);
    }

    .tab2 {
      height: calc(100% - 96px);
      background-color: #e0b945;
    }

    .tab3 {
      height: calc(100% - 144px);
      background-color: #8bc34a;
    }

    .tab4 {
      height: calc(100% - 192px);
      background-color: #8c2f6c;
    }

    .tab5 {
      height: calc(100% - 240px);
      background-color: var(--primary-color);
    }

    .hidden {
      display: none;
    }

    .overlay {
      display: flex;
      flex-direction: column;
      justify-content: start;
      align-items: center;
      position: absolute;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      pointer-events: none;
      -moz-box-shadow:    inset 0 0 10px #00000080;
      -webkit-box-shadow: inset 0 0 10px #00000080;
      box-shadow:         inset 0 0 10px #00000080;
      z-index: 3;
    }

    .in-progress {
      opacity: 0.7;
      background-color: black;
      transition: background-color 2s ease-in;
      pointer-events: auto;
    }

    .overlay casper-timed-status {
      margin-top: 40vh;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
      --casper-timed-status-countdown-color: var(--primary-color);
      /*--casper-timed-status-ring-color: var(--primary-color);
      --casper-timed-status-progress-color: var(--izibizi-primary-color);
      --casper-timed-status-icon: /static/icons/millennium;
      --casper-timed-status-icon-check: /static/icons/check;
      --casper-timed-status-icon-error: /static/icons/error;
      --casper-timed-status-icon-timeout: /static/icons/timeout;*/
    }

    .overlay h2 {
      margin: 6px;
      color: white;
      font-size: 16px;
      font-weight: normal;
    }

    casper-epaper-page {
      position: absolute;
      place-self: center;
    }

    .back-page {
      background-color: #fffbc3;
    }

  `;

  constructor () {
    super();
    this._docStack = []; // data model of the document stack
    this._docTabs  = []; // tabs that control the document stack
    this._docMap = new Map();
    this.zoom = 1;
    this._pageWidth  = 595;
    this._pageHeight = 842;
    this._currentDetail = undefined; // TODO void this when document is redrawn
    window.pig = this; // TODO remove!!!
  }

  async openAttachment (attachment, attachmentIndex, controlButtonsOptions = {}) {
    /*
      Review all this "crappy bloat"

    this.__controlButtonsOptions = controlButtonsOptions;

    if (Array.isArray(attachment) && attachment.length > 0) {
      this.__currentAttachments = attachment;
      this.__currentAttachmentIndex = attachmentIndex !== undefined && attachmentIndex < attachment.length ? attachmentIndex : 0;
      this.__currentAttachment = this.currentAttachment = { ...this.__currentAttachments[this.__currentAttachmentIndex] };
    } else {
      this.__currentAttachments = undefined;
      this.__currentAttachmentIndex = undefined;
      this.__currentAttachment = this.currentAttachment = { ...attachment };
    }

    this.__currentAttachmentCheckList = attachment.tasks;*/

    //this.__handleAttachmentNavigationButtons();
    //this.__openAttachment();
    switch ( attachment.type ) {
      case 'file/pdf':
      case 'file/xml':
      case 'file/txt':
      case 'file/htm':
      case 'file/html':
      case 'file/email':
      case 'file/png':
      case 'file/jpg':
      case 'file/jpeg':
      case 'html':
      default:
        // TODO
        break;
      case 'epaper':
        return await this.openEpaper(attachment);
    }
  }

  /**
   * Sets the epaper's zoom to a specific value.
   */
  setZoom (zoom) {
    /*if (this.zoom >= CasperEpaper.EPAPER_MIN_ZOOM && this.zoom <= CasperEpaper.EPAPER_MAX_ZOOM) {
      this.zoom = zoom;
    }*/
  }

  //***************************************************************************************//
  //                                ~~~ LIT life cycle ~~~                                 //
  //***************************************************************************************//

  _renderTabs () {
    if ( this._docStack.length < 2 ) {
      return undefined;
    }
    const tabs = [];
    for ( let idx = 1; idx < this._docStack.length; idx++) {
      tabs.push(html`
        <div .idx=${idx-1} class="tab tab${idx}">
          <span class="rotate">${this._docStack[idx-1].document.title}</span>
        </div>`);
    }
    return tabs;
  }

  render () {

    return html`
      <div class="background" @click="${(e) => this._pageClick(e)}" @mousemove="${(e) => this._mouseMove(e)}">
        <casper-epaper-page id="back">
        </casper-epaper-page>
        <casper-epaper-page id="page">
        </casper-epaper-page>
        ${this._renderTabs()}
        <div class="toolbar">
          <casper-icon-button @click="${(e) => this._zoomOut(e)}"          tooltip="Reduzir"         icon="fa-light:minus" reverse></casper-icon-button>
          <casper-icon-button @click="${(e) => this._zoomIn(e)}"           tooltip="Ampliar"         icon="fa-light:plus" reverse></casper-icon-button>
          <casper-icon-button @click="${(e) => this._gotoPreviousPage(e)}" tooltip="Página anterior" icon="fa-light:arrow-left"></casper-icon-button>
          <casper-icon-button @click="${(e) => this._gotoNextPage(e)}"     tooltip="Página seguinte" icon="fa-light:arrow-right"></casper-icon-button>
        </div>
      </div>
      <div id="overlay" class="overlay" @click=${(e) => this._overlayClicked(e) }>
        <casper-timed-status id="status"></casper-timed-status>
        <h2 id="status-label">${this.statusMsg}</h2>
      </div>
    `;
  }

  willUpdate (changedProperties) {

    if ( changedProperties.has('zoom') && this._page ) {
      this._page.style.width  = this._pageWidth  * this.zoom + 'px';
      this._page.style.height = this._pageHeight * this.zoom + 'px';
    }
  }

  firstUpdated (changedProperties) {
    this._page = this.shadowRoot.getElementById('page');
    this._page.style.width  = this._pageWidth  * this.zoom + 'px';
    this._page.style.height = this._pageHeight * this.zoom + 'px';
    this._back = this.shadowRoot.getElementById('back');
    this._back.style.width  = this._pageWidth  * this.zoom + 'px';
    this._back.style.height = this._pageHeight * this.zoom + 'px';
    this._back.style.display = 'none';

    this._overlay     = this.shadowRoot.getElementById('overlay');
    this._status      = this.shadowRoot.getElementById('status');
    this._statusLabel = this.shadowRoot.getElementById('status-label');
    this._hideOverlay();
  }

  //***************************************************************************************//
  //                             ~~~ internal methods ~~~                                  //
  //***************************************************************************************//

  /**
   * Navigate to the previous page.
   */
  async _gotoPreviousPage () {
    if (this._currentPage > 1) {
      this._currentPage--;
      await this._socket.gotoPage(this._document.serverId, this._currentPage); // TODO manage chapters
    }
  }

  /**
   * Navigate to the next page.
   */
  async _gotoNextPage () {
    this._currentPage++; // TODO limit page when we know
    await this._socket.gotoPage(this._document.serverId, this._currentPage);
  }

  /**
   * Decreases the epaper's zoom.
   */
  async _zoomOut () {
    if ( this.zoom > this.MIN_ZOOM ) {
      this.zoom *= 0.8;
    }
  }

  /**
   * Increases the epaper's zoom.
   */
  async _zoomIn () {
    if ( this.zoom < this.MAX_ZOOM ) {
      this.zoom *= 1.2;
    }
  }

  /**
   * Open server document
   *
   * @param {Object} documentModel an object that specifies the layout and data of the document
   */
  async openEpaper (documentModel) {
    this._unregisterDocumentHandlers();
    this._hideBackPage();
    const entry = await this._openEpaper(documentModel);
    this._docStack = [ entry ];
    this._document = this._docStack[this._docStack.length -1];
    this._docTabs = [];
    this.requestUpdate();
  }

  async pushEpaper (documentModel) {
    if ( this._docStack.length >= 5 ) {
      //todo error
      return;
    }
    // render current document on the back page
    this._renderAndSlideLeft(this._document.page);

    const entry = await this._openEpaper(documentModel);
    if ( entry ) {
      this._docStack.push(entry);
      this._document = this._docStack[this._docStack.length -1];
      this.requestUpdate();
      await this.updateComplete;
      this._docTabs = this.shadowRoot.querySelectorAll('.tab');
      setTimeout((e) => {
          for (const tab of this.shadowRoot.querySelectorAll('.tab')) {
            tab.classList.add('tab-slide');
          }
        }, 100
      );  
    }
  }

  async _popEpaper () {
    const entry = this._docStack.pop();
    this._document = this._docStack[this._docStack.length -1];
    this._socket.unregisterDocumentHandler(entry.serverId);
    this._docMap.delete(entry.serverId);
    await this._socket.closeDocument(entry.serverId, false);

    // TODO review
    this._pageWidth  = this._document.width;
    this._pageHeight = this._document.height;
    this._page.style.width  = this._pageWidth  * this.zoom + 'px';
    this._page.style.height = this._pageHeight * this.zoom + 'px';
  }

  /**
   * Inner open
   * @param {*} documentModel 
   * @returns 
   */
  async _openEpaper (documentModel) {

    const timeout = 30;
    try {
      this._showOverlay('A carregar documento', timeout);

      if ( documentModel.epaper2 ) { // # TODO a clean api o app to get the proper socket
        this._socket = app.socket2;
        clearInterval(this._pigTimer);
        this._pigTimer = setInterval((e) => {
          app.socket2.keepAlive();
        }, 120 * 1000); // HACK FOR OCC CONGRESS
      } else {
        this._socket = app.socket;
      }

      //this._currentPage = 1; // # TODO goto page on open /
      /*if ( documentModel.backgroundColor ) {
        this._setBackground(documentModel.backgroundColor);
      } else {
        this._setBackground('#FFF');
      }*/
      const entry = this._createDocumentEntry(documentModel);

      let response;

      if (this._jrxml !== entry.chapter.jrxml || this._locale !== entry.chapter.locale || entry.chapter.close_previous === false) {

        response = await this._socket.openDocument(entry.chapter);

        if (response.errors !== undefined) {
          //this.__clear();
          //throw new Error(response.errors);
          // #TODO new error display
          return undefined;
        }
        entry.serverId = response.id;
        entry.width    = response.page.width;
        entry.height   = response.page.height;

        this._socket.registerDocumentHandler(response.id, (message, id) => this._documentHandler(message, id));
        this._docMap.set(response.id, entry);

        this._pageWidth  = response.page.width;
        this._pageHeight = response.page.height;

        if (isNaN(this._pageHeight) || this._pageHeight < 0) {
          this._pageHeight = 4000;
          //this.$['canvas-container'].style.overflow = 'auto';
        } else {
          //this.$['canvas-container'].style.overflow = '';
        }

        //this.__rightMmargin = response.page.margins.right;
        this._jrxml        = entry.jrxml;
        this._locale       = entry.locale; 
      }

      response = await this._socket.loadDocument({
        id:       entry.serverId,
        editable: entry.chapter.editable,
        limit:    entry.chapter.limit,
        path:     entry.chapter.path,
        scale:    1,
        focus:    true, // TODO review the purpose
        page:     entry.pageNumber
      });

      if ( response.errors !== undefined ) {
        //this.__clear();
        //throw new Error(response.errors);
        // #TODO new error display
        return undefined;
      }
      this._hideOverlay();
      this._currentPage = 1;  // to react to page from server this how chapters work
      return entry;

    } catch (error) {
      console.log()
      this._showError(error);
      return undefined; // TODO how to handle upstream
    }
  }

  /**
   * Sanitizes the document model, auto selects the first chapter
   *
   * @param {Object} documentModel the document model
   * @return the sanitized document model
   */
  _createDocumentEntry (documentModel) {
    // deep clone the model ...
    const document = JSON.parse(JSON.stringify(documentModel));

    // ... build the (document stack) entry ...
    const entry = {
      document:       document,
      chapter:        document.chapters[0],
      chapterCount:   document.chapters.length,
      chapterIndex:   0,
      totalPageCount: 0,
      serverId:       undefined,
      width:          undefined,
      height:         undefined,
    }

    // ... ensure the model chapters have sane defaults ...
    for (const chapter of document.chapters) {
      chapter.locale    = chapter.locale    || 'pt_PT';
      chapter.editable  = chapter.editable  || false;
      chapter.pageCount = chapter.pageCount || 1; // was document.pageCount ?? strange
    }

    return entry;
  }

  _unregisterDocumentHandlers () {
    for (const doc of this._docStack) {
      this._socket.unregisterDocumentHandler(doc.serverId);
    }
    this._docMap.clear();
  }

  _documentHandler (message, docId) {
    switch (message[0]) {
      case 'J':
        const doc = this._docMap.get(docId);
        if ( doc === undefined ) {
          // this doc is no longer active, just ignore
          return;
        }
        doc.page = JSON.parse(message.substring(2, message.length - 1));
        this._page.renderAsSvg(doc.page, this.zoom);

        // TODO coordinate better the tooltip request
        clearTimeout(this._debounceTooltip);
        this._debounceTooltip = setTimeout((e) => this._getPageHints(), 200);
        break;

      case 'D': // Ignore V1 protocol (aka "gerber") drawing orders
        break;
      default:
        console.log('Unknown message type ', message);
        break;
    }
  }

  async _getPageHints () {
    const tits = await this._socket.getPageHints(this._document.serverId);
    // TODO confirm page and document ID
    this._page.renderSvgTooltips(tits);
  }

  _mouseMove (event) {
    let overTab    = false;
    const path     = event.composedPath();

    this._page.mouseMove(event); // maybe ok to be down there V

    // TODO review this crap
    // detect hovered element change ...
    if ( this._lastOnOverElem === undefined || this._lastOnOverElem !==  path[0] ) {
      // ... the element under mice has changed
      this._lastOnOverElem =  path[0];

      app.tooltip.mouseMoveToolip(event);

      //this._page.mouseMove(event); // maybe ok to be here ^

      for (const elem of path) {
        if ( elem.classList ) {
          if ( elem.classList.contains('tab') ) {
            this._handleMouseOverTab(elem);
            overTab = true;
            break;
          }
          if ( elem.classList.contains('rotate') ) {
            this._handleMouseOverTab(elem.parentElement);
            overTab = true;
            break;
          }
          if ( elem.classList.contains('tooltip') ) {
            console.log('it exists after all');
          }
        }
      }
      if ( this._docTabs.length !== 0 && ! overTab ) {
        this._handleMouseOutOfTab();
      }
    }
  }

  async _handleTabClick (tab) {
    for (const t of this._docTabs) {
      if ( t.idx >= tab.idx ) {
        await this._popEpaper();
      }
    }
    this._hideBackPage();
    this.requestUpdate();
    await this.updateComplete;
    this._docTabs = this.shadowRoot.querySelectorAll('.tab');
  }

  _handleMouseOverTab (tab) {
    console.log('mouse over tab ', tab.idx);

    /* not hidding tabs for now  
    for (const t of this._docTabs) {
      if ( t.idx <= tab.idx ) {
        t.classList.remove('tab-slide');
      } else {
        t.classList.add('tab-slide');
      }
    }*/
    if ( this._back.style.zIndex !== '1' ) { // hack
      this._renderAndOverRight(this._docStack[tab.idx].page);
    }
  }

  _handleMouseOutOfTab () {
    console.log('mouse out of tabs');
    for (const tab of this._docTabs) {
      tab.classList.add('tab-slide');
    }
    if ( this._back.style.zIndex === '1' ) { // hack
      this._hideAndSlideLeft();
    }
  }

  async _pageClick (event) {

    for (const elem of event.composedPath()) {
      if ( elem.classList && elem.classList.contains('epaper-link') ) {
        // TODO use CTM inverse?  +fro SVG relative coordinates ?
        const rect = this._page.getBoundingClientRect();
        const link = await this._socket.getLink(
          this._document.serverId,
          (event.pageX - rect.left) / this.zoom,
          (event.pageY - rect.top)  / this.zoom
        );
        const idx = link.handler.lastIndexOf('/') + 1;
        const module = await import(`${link.handler.slice(0,idx)}${app.digest ? `${app.digest}.` : ''}${link.handler.slice(idx)}`);
        await this.pushEpaper(await module.link_handler(link, this._document));
        break;
      } else if ( elem.classList && elem.classList.contains('tab') ) {
        this._handleTabClick(elem);
      }
    }
  }

  _renderAndSlideLeft (page) {
    this._back.style.opacity    = 1;
    this._back.style.transition = 'none';
    this._back.style.transform  = 'translateX(0px)';
    this._back.renderAsSvg(page, this.zoom);
    this._back.style.display    = 'block';
    const prect = this._back.getBoundingClientRect();
    const erect = this.getBoundingClientRect();
    this._back.style.transition = 'transform 1s';
    this._back.style.transform  = `translateX(-${prect.width + prect.left - erect.left}px)`;
  }

  _renderAndOverRight (page) {
    this._back.style.transition = 'none';
    this._back.renderAsSvg(page, this.zoom);
    this._back.style.display    = 'block';
    this._back.style.zIndex     = 1;
    this._back.getBoundingClientRect(); // to force sync style update
    this._back.style.transition = 'transform 1s';
    this._back.style.transform  = 'translateX(0px)';
    this._back.style.opacity    = 0.8;
  }

  _hideAndSlideLeft () {
    this._back.style.zIndex     = 0;
    this._back.style.transition = 'none';
    this._back.style.transform  = 'translateX(0px)';
    this._back.style.display    = 'block';
    const prect = this._back.getBoundingClientRect();
    const erect = this.getBoundingClientRect();
    this._back.style.transition = 'transform 1s';
    this._back.style.transform  = `translateX(-${prect.width + prect.left - erect.left}px)`;
  }

  _hideBackPage () {
    this._back.style.display    = 'none';
    this._back.style.zIndex     = 0;
    this._back.style.transition = 'none';
    this._back.style.transform  = 'translateX(0px)';
  }

  _getIconForFileType (fileType) {
    switch (fileType) {
      case 'epaper':
      case 'file/pdf':
        return 'fa-light:file-pdf';
      case 'file/txt':
        return 'fa-light:file-alt';
      case 'file/xml':
      case 'file/htm':
      case 'file/html':
        return 'fa-light:file-code';
      case 'file/png':
      case 'file/jpg':
      case 'file/jpeg':
        return 'fa-light:file-image';
      default:
        return 'fa-light:file-alt';
    }
  }

  _showOverlay (message, timeout) {
    this._status.timeout = timeout;
    this._status.state = 'idle';
    this._status.state = 'connecting';
    this.statusMsg = message;
    this._overlay.classList.add('in-progress');
    this._status.classList.remove('hidden');
    this._statusLabel.classList.remove('hidden');
  }

  _hideOverlay () {
    this._status.state = 'idle';
    this._status.classList.add('hidden');
    this._statusLabel.classList.add('hidden');
    this._overlay.classList.remove('in-progress');
  }

  _showError (error) {
    this.statusMsg = error;
    this._status.state = 'error';
    this._overlay.classList.add('in-progress');
    this._status.classList.remove('hidden');
    this._statusLabel.classList.remove('hidden');
  }

  _overlayClicked (event) {
    console.log(event);
    this._hideOverlay();
  }
}

customElements.define('casper-epaper-lit', CasperEpaperLit);
