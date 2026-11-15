import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Files (photos, voice messages) live in S3-compatible storage, not in our database.
 * The phone uploads directly to storage with a short-lived "pre-signed" URL,
 * so big files never pass through our API server.
 */
export interface FileStorage {
  /** URL the phone can PUT a file to. `publicEndpoint` = address the phone can reach. */
  presignUpload(key: string, contentType: string, publicEndpoint?: string): Promise<string>;
  /** Short-lived download URL. */
  presignDownload(key: string, publicEndpoint?: string): Promise<string>;
  /** Size and type of an uploaded file, or null if it doesn't exist. */
  head(key: string): Promise<{ size: number; contentType: string | undefined } | null>;
}

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const UPLOAD_URL_TTL_SECONDS = 10 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

export class S3Storage implements FileStorage {
  private readonly clients = new Map<string, S3Client>();

  constructor(private readonly opts: S3StorageOptions) {}

  /** The signature includes the host, so we need one client per public address. */
  private client(endpoint = this.opts.endpoint): S3Client {
    let client = this.clients.get(endpoint);
    if (!client) {
      client = new S3Client({
        endpoint,
        region: this.opts.region,
        forcePathStyle: true, // http://host/bucket/key (works with every S3-compatible service)
        credentials: {
          accessKeyId: this.opts.accessKeyId,
          secretAccessKey: this.opts.secretAccessKey,
        },
      });
      this.clients.set(endpoint, client);
    }
    return client;
  }

  /** Development helper: create the bucket on first start. */
  async ensureBucket(): Promise<void> {
    const Bucket = this.opts.bucket;
    try {
      await this.client().send(new HeadBucketCommand({ Bucket }));
    } catch {
      await this.client().send(new CreateBucketCommand({ Bucket }));
    }
  }

  presignUpload(key: string, contentType: string, publicEndpoint?: string): Promise<string> {
    return getSignedUrl(
      this.client(publicEndpoint),
      new PutObjectCommand({ Bucket: this.opts.bucket, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
  }

  presignDownload(key: string, publicEndpoint?: string): Promise<string> {
    return getSignedUrl(
      this.client(publicEndpoint),
      new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );
  }

  async head(key: string) {
    try {
      const res = await this.client().send(
        new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }),
      );
      return { size: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch {
      return null;
    }
  }
}
