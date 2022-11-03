/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
// user drag in an image, and then we upload it to the blob storage

// declare global blobStorage

export async function demo(blobStorage: BlobStorage) {
  // 1. when user drag image into brwoser
  const image = new Image(); // should get from DnD event
  const blob = toBlob(image);
  const hash = await blobStorage.upload(blob);

  // placeholder
  const unbornBlockRef = space.addBlock({
    flavour: 'affine:embed',
    type: 'image',
  });

  // resources ready
  space.updateBlock(unbornBlockRef, { resource: resourceId });

  // 2. EmbedBlockModel will be inintialised
  // here we are inside embed-block.ts
  embedBlock.resouce; // ResourceID

  // 3. Get the blob url based on the hash
  const blobURL = await blobStorage.getWebURL(hash);
  // inside lit template
  // <image src="${blobURL}"/>
}

type ResourceID = `res${string}`;

type BlobInput = string | Blob | BufferSource | ReadableStream<any>;

type IndexedDBBlobStorageConfig = {
  filename?: string;
};

export class IndexedDBBlobStorage implements BlobStorage {
  constructor(private config: IndexedDBBlobStorageConfig) {}
}

type MirroredBlobStorageConfig = {
  mirroredTo: BlobStorage[];
};

export class MirroredBlobStorage implements BlobStorage {
  constructor(private config: MirroredBlobStorageConfig) {}
}

export interface BlobStorage {
  /** Upload a new blob */
  upload(blobInput: BlobInput): Promise<ResourceID>;
  getDebugInfo(resId: ResourceID): Promise<Record<string, unknown>>;
  getWebURL(resId: ResourceID): Promise<URL>;

  // Hmm: How will we handle exporting large files / lots of files?
  // We shouldn't just glob together everything into a big JSON, right?
  // Should we require exporting by individual resource ids?
  // Should exporting be a part of a higher interface on a per storage basis?
  // e.g. export for a Torrent or IPFS stored resources might actually export Content Hashes
  // and import takes those to re-associate them...
  // But, that feels like a specific for the specific storage.
  export(): Promise<Record<string, unknown>>;
  import(): Promise<void>;
}

function todo<T>(message: string, ...args: any[]): T {
  throw new Error(`Unimplemented: ${message}`);
}
