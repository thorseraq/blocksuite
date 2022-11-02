import { BaseBlockModel, IBaseBlockProps } from './base';
import type { Store } from './store';

/** Some binary blob */
type ResourceData = {
  id: ResourceIDString;
  extType: string;
  /** e.g. "indexdb", "gdrive" */
  /** e.g. "filename.pdf", "217389ad87aw9d8" */
  extID: string;
  // hmm...
  // /** e.g. null, "colelawrence" */
  // extMeta: Record<string, string | number | null> | null;
};

type ResourceIDString = `res${string}`;

/** Some binary blob */
interface IResourceRef {
  readonly resourceID: ResourceIDString;
  /** Can this be accessed via web to get this */
  webURLAccess(options?: { baseURL?: string }): Promise<URL>;
}

interface IBinaryBlobWebURLProvider {
  /** Could be a base64 datauri, a object URL, or an external URL */
  getBlobWebURL(resourceID: ResourceIDString): Promise<URL>;
}

type todo<T> = unknown;

type TodoInputBinaryData =
  todo<'Some data either URL / ArrayUint8 or whatever'>;

interface IBinaryBlobStorageDevice {
  /** Debug inspection info */
  getBlobDebugInfo(
    resourceID: ResourceIDString
  ): Promise<Record<string, unknown>>;
  /** Store binary blob under resource ID */
  setBlob(
    resourceID: ResourceIDString,
    data: TodoInputBinaryData
  ): Promise<void>;
}

type IndexedDBBlobStorageOptions = {
  version: number;
  databaseName: string;
};

class IndexedDBBlobStorage
  implements IBinaryBlobWebURLProvider, IBinaryBlobStorageDevice
{
  public readonly version: number;
  public readonly databaseName: string;
  private assets: Record<string, unknown>;
  private db = makeErrObject('db not initialized');
  private constructor(options: Partial<IndexedDBBlobStorageOptions> = {}) {
    this.version = options.version || 1;
    this.databaseName = options.databaseName || 'blobstorage';
    this.assets = {};
  }
  static create(
    options: Partial<IndexedDBBlobStorageOptions> = {}
  ): Promise<IndexedDBBlobStorage> {
    const uninit = new IndexedDBBlobStorage(options);
    return new Promise<IndexedDBBlobStorage>((resolve, reject) => {
      /** refactor? can we use a better short-circuit? */
      let rejected = false;
      const request = indexedDB.open(uninit.databaseName, uninit.version);

      request.onupgradeneeded = event => {
        const upgradeNeededEventTarget = event.target;
        if (upgradeNeededEventTarget instanceof IDBOpenDBRequest) {
          upgradeNeededEventTarget.result.createObjectStore('cache');
        } else {
          rejected = true;
          reject(
            new Error(
              'internal: upgradeNeededEventTarget is not IDBOpenDBRequest'
            )
          );
        }
      };

      request.onsuccess = () => {
        if (rejected) return;
        uninit.db = request.result;

        uninit.db.onerror = () => {
          rejected = true;
          reject(new Error('internal: error creating/accessing db'));
        };

        if (uninit.db.setVersion && uninit.db.version !== uninit.version) {
          const version = uninit.db.setVersion(uninit.version);
          version.onsuccess = () => {
            if (rejected) return;
            uninit.db.createObjectStore('cache');
            resolve(uninit);
          };
        } else {
          resolve(uninit);
        }
      };
    });
  }
  setBlob(
    resourceID: ResourceIDString,
    data: TodoInputBinaryData
  ): Promise<void> {
    throw new Error('setBlob not implemented');
  }
  getBlobDebugInfo(
    resourceID: ResourceIDString
  ): Promise<Record<string, unknown>> {
    throw new Error('getBlobDebugInfo not implemented');
  }
  /** Pull out an object URL for the specified ResourceIDString as key. */
  getBlobWebURL(resourceID: ResourceIDString): Promise<URL> {
    throw new Error('getBlobWebURL not implemented');
  }
}

class BinaryBlobResourceRef implements IResourceRef {
  constructor(
    private readonly blobProvider: IBinaryBlobWebURLProvider,
    public readonly resourceID: ResourceIDString
  ) {}
  async webURLAccess(options?: { baseURL?: string }): Promise<URL> {
    return this.blobProvider.getBlobWebURL(this.resourceID);
  }
}

// interface Provider {
//   // ...
// }

export class ResourceManager {
  private _provider: Provider;
  private readonly _store: Store;
  private readonly _resources: Map<string, ResourceData>;

  constructor(store: Store) {
    this._store = store;
    this._resources = new Map();
  }

  get store() {
    return this._store;
  }

  get resources() {
    return this._resources;
  }

  addResource(resource: ResourceData) {
    this._resources.set(resource.id, resource);
  }

  getResource(id: string) {
    return this._resources.get(id);
  }

  removeResource(id: string) {
    this._resources.delete(id);
  }
}

export interface ImageBlockProps extends IBaseBlockProps {
  flavour: 'image';
  resource: IResourceRef;
}

export class ImageBlockModel extends BaseBlockModel implements ImageBlockProps {
  flavour = 'image' as const;
  resource: IResourceRef;

  constructor(store: Store, props: Partial<ImageBlockProps>) {
    super(store, props);
    this.resource = props.resource ?? new Resource();
  }
}

const store: any = null!;

// const resourceManager =
store.connect(resourceManager);
store.addBlock({ flavour: 'image', resource });
