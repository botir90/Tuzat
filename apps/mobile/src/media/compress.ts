import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Makes a phone photo small before upload (a 4 MB camera photo becomes ~200 KB).
 * Important on slow 3G and for users with little mobile data.
 */
export async function compressPhoto(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}
