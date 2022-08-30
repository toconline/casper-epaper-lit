/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */


// https://marian-caikovski.medium.com/do-not-waste-users-time-on-rendering-off-screen-content-eed17636e7a7

import { html, css, LitElement } from 'lit';

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
        if ( true) {
        this._styleSheet.insertRule(`
          .${this._currentTextClass} {
            font-family: ${this._font};
            font-size: ${this._fontSize}px;
            fill: ${this._textColor};
            font-weight: ${this._fontMask & EpaperRenderer.BOLD_MASK ? 'bold' : 'normal'}
          }
        `);
        } else {
        this._styleSheet.insertRule(
        '.'+ this._currentTextClass
           +'{font-family:'
           + this._font
           +';font-size:'
           + this._fontSize
           + 'px;fill:'
           + this._textColor
           +';font-weight:'
           + this._fontMask & EpaperRenderer.BOLD_MASK ? 'bold' : 'normal'
           + '}');
        }
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
              t.setAttribute('class', this._currentTextClass + ' epaper-link');
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

  get MAX_ZOOM () { return 3;   }
  get MIN_ZOOM () { return 0.5; }

  static properties = {
    zoom: {
      type: Number,
      reflect: true
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

    .tab-slide {
      transform: translate3d(0%, 0, 0);
      transition: transform 0.5s ease-in;
      box-shadow: 1px 2px 6px -1px rgba(0, 0, 0, 0.6);
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

    .shadow {
      position: absolute;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      pointer-events: none;
      -moz-box-shadow:    inset 0 0 10px #00000080;
      -webkit-box-shadow: inset 0 0 10px #00000080;
      box-shadow:         inset 0 0 10px #00000080;
    }

    .page {
      background-color: white;
      place-self: center;
    }

    .ilcanvas {
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

  constructor () {
    super();
    this._svgRenderer = new EpaperSvgRenderer();
    this._docStack = []; // data model of the document stack
    this._docTabs  = []; // tabs that control the document stack
    this.zoom = 1;
    this._pageWidth  = 595;
    this._pageHeight = 842;

    window.pig = this;
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

  async __openAttachment () {
    //this.__customAttachmentFileType = false;
    //this.__currentAttachmentName = this.__currentAttachment.name ? this.__currentAttachment.name : '';
    //this.__updateDownloadIconAndTooltip();

    // Open the attachment.
    /*try {
      switch (this.__currentAttachment.type) {
        case 'file/pdf':
          await this.__openPDF();
          break;
        case 'file/xml':
        case 'file/txt':
        case 'file/htm':
        case 'file/html':
        case 'file/email':
          this.__landscape = false;
          await this.__openIframe();
          break;
        case 'file/png':
        case 'file/jpg':
        case 'file/jpeg':
          this.__landscape = false;
          await this.__openImage();
          break;
        case 'epaper':
          await this.__openServerDocument();
          break;
        case 'html':
          this.__landscape = this.__currentAttachment.landscape;
          await this.__openIframe();
          break;
        default:
          if (this.__currentAttachment.type.startsWith('file/')) {
            this.__customAttachmentFileType = true;
            this.openGenericPage(this.$['download-generic-file-template']);
          }
          break;
      }
    } catch (error) {
      console.error(error);

      //this.__displayErrorPage();
    }*/
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

  render () {

    return html`
      <div class="background" @click="${(e) => this._pageClick(e)}" @mousemove="${(e) => this._mouseMove(e)}">
        ${this._docStack.map((document, idx) => html`
          <div .idx=${idx} class="tab tab${idx+1}">
            <span class="rotate">${document.title}</span>
          </div>`)
        }
        <div id="page" class="page">
          <svg id="ilsvg" class="ilcanvas">
          </svg>
        </div>
        <div class="toolbar">
          <casper-icon-button @click="${(e) => this._zoomOut(e)}"          tooltip="Reduzir"         icon="fa-light:minus" reverse></casper-icon-button>
          <casper-icon-button @click="${(e) => this._zoomIn(e)}"           tooltip="Ampliar"         icon="fa-light:plus" reverse></casper-icon-button>
          <casper-icon-button @click="${(e) => this._gotoPreviousPage(e)}" tooltip="Página anterior" icon="fa-light:arrow-left"></casper-icon-button>
          <casper-icon-button @click="${(e) => this._gotoNextPage(e)}"     tooltip="Página seguinte" icon="fa-light:arrow-right"></casper-icon-button>
        </div>
      </div>
      <div class="shadow">
      </div>
    `;
  }

  willUpdate (changedProperties) {

    if ( changedProperties.has('zoom') && this._svgRenderer._svg ) {
      this._page.style.width  = this._pageWidth  * this.zoom + 'px';
      this._page.style.height = this._pageHeight * this.zoom + 'px';
    }
  }

  firstUpdated (changedProperties) {
    // temporary plumbing for sandbox
    this._svgRenderer._svg    = this.shadowRoot.getElementById('ilsvg');

    this._svgRenderer._holder = this.shadowRoot.getElementById('page');
    this._page = this.shadowRoot.getElementById('page');
    this._page.style.width  = this._pageWidth  * this.zoom + 'px';
    this._page.style.height = this._pageHeight * this.zoom + 'px';

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

  /**
   * Navigate to the previous page.
   */
  async _gotoPreviousPage () {
    if (this._currentPage > 1) {
      this._currentPage--;
      if ( 2.0 === this._socket._version ) { // [AG] - HB: required on v2...
        //await this._currentPageChanged(this._currentPage)
        await this._socket.gotoPage(this.documentId, this._currentPage);
      }
    }
  }

  /**
   * Navigate to the next page.
   */
  async _gotoNextPage () {
    if ( 2.0 === this._socket._version ) { // [AG] - HB: required on v2...
      this._currentPage++;
      //await this._currentPageChanged(this._currentPage);
      await this._socket.gotoPage(this.documentId, this._currentPage);
    } else {
      if (this._currentPage < this.__totalPageCount) {
        this._currentPage++;
      }
    }
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

    if ( documentModel.epaper2 ) { // # TODO a clean api o app to get the proper socket
      this._socket = app.socket2;
    } else {
      this._socket = app.socket;
    }

    this._currentPage = 1; // # TODO goto page on open /
    /*if ( documentModel.backgroundColor ) {
      this._setBackground(documentModel.backgroundColor);
    } else {
      this._setBackground('#FFF');
    }*/

    this._prepareOpenCommand(documentModel);
    return await this._openChapter();
  }

  /**
   * Sanitizes the document object model, auto selects the first chapter
   *
   * @param {Object} documentModel the document model
   */
  _prepareOpenCommand (documentModel) {
    this.document       = JSON.parse(JSON.stringify(documentModel));
    this._chapterCount  = this.document.chapters.length;
    this.totalPageCount = 0;

    for (let idx = 0; idx < this._chapterCount; idx++) {
      this.document.chapters[idx].locale    = this.document.chapters[idx].locale    || 'pt_PT';
      this.document.chapters[idx].editable  = this.document.chapters[idx].editable  || false;
      this.document.chapters[idx].pageCount = this.document.pageCount               || 1;
      this.totalPageCount += this.document.chapters[idx].pageCount;
    }
    this._chapterIndex = 0;
    this._chapter      = this.document.chapters[0];
    this._edition      = false;
  }

  /**
   * Opens the currently selected chapter
   *
   * @param {number} pageNumber page starts at 1
   */
   async _openChapter (pageNumber) {
    //this.loading = true;

    //this.__inputBoxDrawString = undefined;
    //this.$.servertip.enabled = false;
    //this.$.input.setVisible(false);
    //this.__hideWidgets(true);
    //this.__resetScroll();
    this._nextPage  = pageNumber || 1;
    //this.__openFocus = this.__chapter.editable ? (this.__nextPage > 0 ? 'start' : 'end') : 'none';
    //this.__loading = true;
    //this.__resetCanvasDimensions();

    let response;

    if (!(this._jrxml === this._chapter.jrxml && this._locale === this._chapter.locale)) {

      response = await this._socket.openDocument(this._chapter);

      if (response.errors !== undefined) {
        //this.__clear();
        //throw new Error(response.errors);
        // #TODO new error display
      }

      this.documentId  = response.id;
      this._socket.registerDocumentHandler(this.documentId, (message) => this._documentHandler(message));
      this._pageWidth  = response.page.width;
      this._pageHeight = response.page.height;

      if (isNaN(this._pageHeight) || this._pageHeight < 0) {
        this._pageHeight = 4000;
        //this.$['canvas-container'].style.overflow = 'auto';
      } else {
        //this.$['canvas-container'].style.overflow = '';
      }



      //this.__rightMmargin = response.page.margins.right;
      this._jrxml        = this._chapter.jrxml;
      this._locale       = this._chapter.locale;
    }

    //this.landscape = this.__pageHeight < this.__pageWidth;
    //this.__zoomChanged();

    this._chapter.id = this.documentId;

    response = await this._socket.loadDocument({
      id:       this.documentId,
      editable: this._chapter.editable,
      limit:    this._chapter.limit,
      path:     this._chapter.path,
      scale:    1, // New gen can use 1 always wos this.__sx,
      focus:    this._openFocus,
      page:     this._nextPage
    });

    if ( response.errors !== undefined ) {
      //this.__clear();
      //throw new Error(response.errors);
      // #TODO new error display
    }

    this._path    = this._chapter.path;
    this._params  = this._chapter.params;
    this._edition = this._chapter.editable;
    //this.documentScale  = this.__sx;

    //this.__scalePxToServer = this.__pageWidth * this.__ratio / this.__canvas.width;

    //this._repaintPage();

    //this.__loading = false;
    //this.$.servertip.enabled = true;
    //this.loading = false;
    return true;
  }

  _documentHandler (message) {
    switch (message[0]) {
      case 'J':
        console.time('parse');
        const page = JSON.parse(message.substring(2, message.length - 1));
        console.timeEnd('parse');

        // TODO temp hack
        this._page.style.width  = this._pageWidth  * this.zoom + 'px';
        this._page.style.height = this._pageHeight * this.zoom + 'px';

        this._svgRenderer.renderPage(page);
        break;
      case 'D':
        // Ignore V1 protocol (aka "gerber") drawing orders
        break;
      default:
        console.log('TODO message: ', message);
        break;
    }
  }

  /**
   * Goto to the specified page. Requests page change or if needed loads the required chapter
   *
   * @param {number} pageNumber the page to render
   */
  async _currentPageChanged (pageNumber) {

    if ( this.document && this.document.chapters && this.document.chapters.length >= 1 ) {
      let currentPage = 1;

      pageNumber = parseInt(pageNumber);
      for ( let i = 0;  i < this.document.chapters.length; i++ ) {
        if ( pageNumber >= currentPage && pageNumber < (currentPage + this.document.chapters[i].pageCount) ) {
          let newPageNumber;

          newPageNumber = 1 + pageNumber - currentPage;
          if ( i === this.__chapterIndex ) {
            if ( this._chapterPageNumber !== newPageNumber ) {
              // #TODO  this.__resetScroll();
              await this._socket.gotoPage(this.documentId, newPageNumber);
              return pageNumber;
            }
          } else {
            this.gotoChapter(i, newPageNumber);
            return pageNumber;
          }
          this._chapterPageNumber = newPageNumber;
        }
        currentPage += this.document.chapters[i].pageCount;
      }
    }
  }

  async _pushDocument (document) {
    if ( this._docStack.size >= 4 ) {
      // todo error
      return;
    }
    this._docStack.push(document);
    this.requestUpdate();
    await this.updateComplete;
    this._docTabs = this.shadowRoot.querySelectorAll('.tab');
    setTimeout((e) => {
      for (const tab of this.shadowRoot.querySelectorAll('.tab')) {
        tab.classList.add('tab-slide');
      }
    }, 1);

  }

  _mouseMove (event) {
    let overTab = false;

    // detect hovered element change ...
    if ( this._lastOnOverElem === undefined || this._lastOnOverElem !==  event.path[0] ) {
      // ... the element under mice has changed
      this._lastOnOverElem =  event.path[0];
      for (const elem of event.path) {
        if ( elem.classList && elem.classList.contains('tab') ) {
          this._handleMouseOverTab(elem);
          overTab = true;
        }
      }
      if ( this._docTabs.length !== 0 && ! overTab ) {
        this._handleMouseOutOfTab();
      }
    }
  }

  async _handleTabClick (tab) {
    for ( let i = this._docStack.length - 1; i >= tab.idx; i--) {
      // await close Sub document
      this._docStack.splice(i,1);
    }
    this.requestUpdate();
    await this.updateComplete;
    this._docTabs = this.shadowRoot.querySelectorAll('.tab');
  }

  _handleMouseOverTab (tab) {
    console.log('mouse over tab ', tab.idx);
    for (const t of this._docTabs) {
      if ( t.idx > tab.idx ) {
        t.classList.remove('tab-slide');
      } else {
        t.classList.add('tab-slide');
      }
    }
  }

  _handleMouseOutOfTab () {
    console.log('mouse out of tabs');
    for (const tab of this._docTabs) {
      tab.classList.add('tab-slide');
    }
  }


  async _pageClick (event) {
    for (const elem of event.path) {
      if ( elem.classList && elem.classList.contains('epaper-link') ) {
        const text = elem.textContent;
        if (text.match(/^\d+\/\d+$/)) {
          console.log('click on transaction link: ', text);
        } else if ( text.match(/^\d+$/)) {
          console.log('click on extracto link: ', text);
          await this.openAttachment({
            title: 'Extrato 2',
            type: 'epaper',
            epaper2: true,
            chapters: [{
                limit: 2,
                close_previous: false,
                jrxml: 'default/account_statement',
                path: `account_statement/0?filter[start_date]=2016-01-01&filter[end_date]=2016-12-31&filter[first_account]=${text}&filter[has_transactions]=true&filter[include_zeroes]=false`
              }
            ]
          });
        }
        break;
      } else if ( elem.classList && elem.classList.contains('tab') ) {
        this._handleTabClick(elem);
      }
    }
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

}

customElements.define('casper-epaper-lit', CasperEpaperLit);
