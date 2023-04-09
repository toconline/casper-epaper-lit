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

    // ... create the svg object ...
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${p.w} ${p.h}`);
    svg.setAttribute('class', 'epaper-svg');

    // create a layer for the bands
    const bandLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if ( this._debug ) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', p.ml);
      r.setAttribute('y', p.mt);
      r.setAttribute('width', p.w - p.ml - p.mr);
      r.setAttribute('height', p.h - p.mt - p.mb);
      r.setAttribute('class', 'debug-margin');
      bandLayer.appendChild(r);
    }

    // ... add rect for each detail band ...
    for (const band of page.e) {
      if ( band.t !== 'DT' ) {
        continue;
      }

      const p = band.p;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', 0);
      r.setAttribute('y', p.oy);
      r.setAttribute('width', page.p.w);
      r.setAttribute('height', p.h);
      r.setAttribute('class', 'detail');
      bandLayer.appendChild(r);
    }
    svg.appendChild(bandLayer);

    // ... create an empty layer for the tooltips ...
    const ttl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ttl.setAttribute('id', 'tt-layer');
    svg.appendChild(ttl);

    // ... background layer for fills and text ...
    this._bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(this._bg);

    // ... foreground layer for lines ...
    this._fg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(this._fg);

    for (const band of page.e) {
      this.renderBand(band, page);
    }

    return svg;
  }

  renderBand (band, page) {
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
        if ( false && p.l === true ) {
          const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const p = element.f.e[0].p;
          r.setAttribute('x', p.x1);
          r.setAttribute('y', p.y1);
          r.setAttribute('width', p.x2 - p.x1);
          r.setAttribute('height', 20 + p.y2 - p.y1);
          r.setAttribute('class', 'epaper-link');
          this._bg.appendChild(r);
        }
        if ( element.ts ) {
          for (const s of element.ts) {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', s.x);
            t.setAttribute('y', s.y);
            t.setAttribute('class', this._currentTextClass + (p.l === true ? ' epaper-link' : ''));
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
        l.setAttribute('class', this._currentLineClass);
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
      case 'I':
        const pig = {
          p: {
            ha: "C",
            i: 140627205072976,
            s: "RS",
            u: "/static/svat-error@1x.png",
            va: "M",
            x1: 36,
            x2: 54,
            y1: 78,
            y2: 96
          },
          t: "I"
        }
        if ( p.u.length > 1 ) {
          //console.log(`Imagine me ${p.i}@${p.u}`);
          const i = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          i.setAttribute('x', p.x1);
          i.setAttribute('y', p.y1);
          i.setAttribute('width', p.x2 - p.x1);
          i.setAttribute('height', p.y2 - p.y1);
          i.setAttribute('href', 'http://127.0.0.1:3201/' + p.u);
          i.setAttribute('preserveAspectRatio', 'xMinYMid meet'); // TODO map preserve AR
          this._bg.appendChild(i);
        }
        /*
                  let img_info = {
            _id:   this.__getDouble(),
            _path: this.__getString(),
            _t:    this.__getDouble(),
            _l:    this.__getDouble(),
            _b:    this.__getDouble(),
            _r:    this.__getDouble(),
            _m:    this.__getString(),
            _h:    this.__getString(),
            _v:    this.__getString()
          };

          let img = this.__images[img_info._path];
          if ( img === undefined && img_info._path.length ) {
            img = new Image();
            this.__images[img_info._path] = img;
            img.onload = function() {
              this.__restartRedrawTimer();
            }.bind(this);
            img.onerror = function() {
              this.__images[img_info._path] = undefined;
            }.bind(this);
            img.src = this._uploaded_assets_url + img_info._path;
            this.__images[img_info._path] = img;
          }
          if ( img && img.complete && typeof img.naturalWidth !== undefined && img.naturalWidth !== 0 ) {
            try {
              this._scale_image(img_info, img);
            } catch (a_err) {
              console.log(a_err);
              // Keep the faulty image in the cache to avoid bombarding the server with broken requests
            }
          }
          break;
          */
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

  renderTooltips(svg, tooltips) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', 'tt-layer');

    for (const t of tooltips.e) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', t.p.x);
      r.setAttribute('y', t.p.y);
      r.setAttribute('width', t.p.w);
      r.setAttribute('height', t.p.h);
      r.setAttribute('tooltip', t.ht);
      r.setAttribute('class', 'tooltip');
      group.appendChild(r);
    }
    return group;
  }

  _updateTextStyle () {
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
  }

  _updateShapeStyle () {
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
    this._currentShapeStyle = `fill:${this._fillColor}`; // TODO use class
  }

}