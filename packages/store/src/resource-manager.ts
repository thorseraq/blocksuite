import { group } from 'console';
import { YArray, YText } from 'yjs/dist/src/internals';
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

// Is this actually necessary?
// Maybe just take the data alone
// /** Some binary blob */
// interface IResourceRef {
//   readonly resourceID: ResourceIDString;
//   /** Can this be accessed via web to get this */
//   getWebURL(options?: { baseURL?: string }): Promise<URL>;
// }

interface IBinaryBlobWebURLProvider {
  /** Could be a base64 datauri, a object URL, or an external URL */
  getBlobWebURL(resourceID: ResourceIDString): Promise<{ href: URL }>;
}

type todo<T> = unknown;

type TodoInputBinaryData =
  todo<'Some data either URL / ArrayUint8 or whatever'>;

interface IBinaryBlobStorageDevice {
  /** Debug inspection info */
  getBlobDebugInfo(
    resourceID: ResourceIDString
  ): Promise<Record<string, unknown>>;
  // If we are using content hash location, then should we prevent
  // setting on a specific hash?
  // /** Store binary blob under resource ID */
  // setBlob(
  //   resourceID: ResourceIDString,
  //   data: TodoInputBinaryData
  // ): Promise<void>;

  // releaseBlob(
  //  id: ResourceIDString,
  //  // useCaseKey: // some kind of associated key for usage site? Thinking about GC / releasing blobs
  // )

  /** Store new binary blob under resource ID */
  createBlob(
    data: TodoInputBinaryData
    // useCaseKey: // some kind of associated key for usage site? Thinking about GC / releasing blobs
  ): Promise<ResourceIDString>;
}

type IndexedDBBlobStorageOptions = {
  version: number;
  databaseName: string;
};

interface IBlobStorage
  extends IBinaryBlobWebURLProvider,
    IBinaryBlobStorageDevice {}

class IndexedDBBlobStorage implements IBlobStorage {
  public readonly version: number;
  public readonly databaseName: string;
  private assets: Record<string, unknown>;
  private db: Promise<IDBDatabase>;
  private constructor(options: Partial<IndexedDBBlobStorageOptions> = {}) {
    this.version = options.version || 1;
    this.databaseName = options.databaseName || 'blobstorage';
    this.assets = {};
    this.db = createDB({
      databaseName: this.databaseName,
      version: this.version,
    });
  }

  async setBlob(
    resourceID: ResourceIDString,
    data: TodoInputBinaryData
  ): Promise<void> {
    const db = await this.db;
    throw new Error('setBlob not implemented');
  }
  async getBlobDebugInfo(
    resourceID: ResourceIDString
  ): Promise<Record<string, unknown>> {
    const db = await this.db;
    throw new Error('getBlobDebugInfo not implemented');
  }
  /** Pull out an object URL for the specified ResourceIDString as key. */
  async getBlobWebURL(resourceID: ResourceIDString): Promise<{ href: URL }> {
    const db = await this.db;
    throw new Error('getBlobWebURL not implemented');
  }
}

function createDB(options: IndexedDBBlobStorageOptions): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    /** refactor? can we use a better short-circuit? */
    let rejected = false;
    const request = indexedDB.open(
      options.databaseName ?? 'defaultdb',
      options.version ?? 1
    );

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
      const db = request.result;

      db.onerror = () => {
        rejected = true;
        reject(new Error('internal: error creating/accessing db'));
      };

      if (db.version !== options.version) {
        const version = db.setVersion(options.version);
        version.onsuccess = () => {
          if (rejected) return;
          db.createObjectStore('cache');
          resolve(db);
        };
      } else {
        resolve(db);
      }
    };
  });
}

class BinaryBlobResourceRef implements IResourceRef {
  constructor(
    private readonly blobProvider: IBinaryBlobWebURLProvider,
    public readonly resourceID: ResourceIDString
  ) {}
  async getWebURL(options?: { baseURL?: string }): Promise<URL> {
    return this.blobProvider.getBlobWebURL(this.resourceID);
  }
}

// interface Provider {
//   // ...
// }

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

class UnbornBlockRef {}

const store: {
  blobStorage: IBlobStorage;
  addBlock(...args: any): UnbornBlockRef;
  getBlockCreated(unborn: UnbornBlockRef): null | BlockId;
} = null!;

const ImageModel = defineModel({
  width: number(),
  height: number(),
  caption: string(),
  resource: blob().optional(),
});

const schema = {
  image: ImageModel,
};

store.register(schema);
store.connect(blobStorage);

const id = store.addBlock({ flavour: 'image', resource: image }, groupModel);

// inside image block

const blobRef = await store.blobStorage.createBlob(
  'https://example.com/image.png'
);

// image: blob URL
const image = store.blobStorage.getBlobWebURL(imageModel.resource); // string
// lit html
// <img src=${image} />
