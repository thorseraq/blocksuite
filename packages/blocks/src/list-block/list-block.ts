/// <reference types="vite/client" />
import { LitElement, html, css, unsafeCSS } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { customElement, property } from 'lit/decorators.js';
import { BLOCK_ID_ATTR, BlockHost } from '../__internal__';

import type { ListBlockModel } from './list-model';
import { getListIcon } from './utils/get-list-icon';
import { getListInfo } from './utils/get-list-info';
import { BlockChildrenContainer } from '../__internal__';
import style from './style.css';

@customElement('list-block')
export class ListBlockComponent extends LitElement {
  static styles = css`
    ${unsafeCSS(style)}
  `;

  @property({
    hasChanged() {
      return true;
    },
  })
  model!: ListBlockModel;

  @property()
  host!: BlockHost;

  // disable shadow DOM to workaround quill
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    this.model.propsUpdated.on(() => this.requestUpdate());
    this.model.childrenUpdated.on(() => this.requestUpdate());
  }

  getImageSrc = applyOnEachChanged(
    (resID: `res${string}`): Promise<null | string> => {
      if (resID === null) {
        return Promise.resolve(null);
      } else {
        return this.host.store.blobStorage
          .getWebURL(resID)
          .then(url => url.toString());
      }
    }
  );

  render() {
    this.setAttribute(BLOCK_ID_ATTR, this.model.id);
    const { deep, index } = getListInfo(this.host, this.model);
    const listIcon = getListIcon({
      model: this.model,
      deep,
      index,
      onClick: () => {
        if (this.model.type !== 'todo') return;
        this.host.space.captureSync();
        this.host.space.updateBlock(this.model, {
          checked: !this.model.checked,
        });
      },
    });
    const childrenContainer = BlockChildrenContainer(this.model, this.host);
    // For the first list item, we need to add a margin-top to make it align with the text
    const shouldAddMarginTop = index === 0 && deep === 0;

    return html`
      <div
        class=${`affine-list-block-container ${
          shouldAddMarginTop ? 'affine-list-block-container--first' : ''
        }`}
      >
        <!-- EXAMPLE Image element with resource -->
        <img
          ${ref(
            img =>
              img instanceof HTMLImageElement &&
              this.getImageSrc(this.model.resource).then(url => {
                img.src = url ?? '';
              })
          )}
        />
        <div
          class=${`affine-list-rich-text-wrapper ${
            this.model.checked ? 'affine-list--checked' : ''
          }`}
        >
          ${listIcon}
          <rich-text .host=${this.host} .model=${this.model}></rich-text>
        </div>
        ${childrenContainer}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'list-block': ListBlockComponent;
  }
}

const NOT_INVOKED = Symbol();
function applyOnEachChanged<T extends string | number | null | undefined, R>(
  fn: (arg: T) => R
): (arg: T) => R {
  let res: R | typeof NOT_INVOKED = NOT_INVOKED;
  let prev: T | typeof NOT_INVOKED = NOT_INVOKED;
  return (arg: T) => {
    if (prev !== arg) {
      // re-calc
      prev = arg;
      res = fn(prev);
    }

    return res as R;
  };
}
