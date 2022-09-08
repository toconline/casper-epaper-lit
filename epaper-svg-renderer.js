/*
 - encoding: utf-8
 -
 - Copyright (c) 2011-2022 Cloudware S.A. All rights reserved
 -
 */

import { EpaperRenderer } from './epaper-renderer.js'

export class EpaperSvgRenderer extends EpaperRenderer {

  renderPage (page, styleSheet) {

    this._styleSheet = styleSheet;

    const p = page.p;
    // start of a new SVG
    this._resetRender();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${p.w} ${p.h}`);
    svg.setAttribute('class', 'epaper-svg');
    this._bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(this._bg);
    this._fg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(this._fg);

    if ( false && this._debug ) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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
    return svg;
  }

  renderBand (band, page) {
    const p = band.p;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', 0);
    r.setAttribute('y', p.oy);
    r.setAttribute('width', page.p.w);
    r.setAttribute('height', p.h);
    r.setAttribute('class', band.t === 'DT' ? 'detail' : 'band');
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
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', s.x);
            t.setAttribute('y', s.y);
            if ( this._useClasses ) {
              t.setAttribute('class', this._currentTextClass + (p.l === true ? ' epaper-link' : ''));
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
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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
        if ( !!p.r ) {
          console.warn("we have a roundie");
        }
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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
    this._currentShapeStyle = `fill:${this._fillColor}`; // TODO use class
  }

}