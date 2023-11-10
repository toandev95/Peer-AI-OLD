import { Tool } from 'langchain/tools';
import { isNil } from 'lodash';

import { prediction } from '@/lib/replicate';

/**
 * A tool that converts an image to text.
 *
 * @author Toan Doan
 */

class ImageToText extends Tool {
  public name: string = 'image-to-text';

  public description: string = `A useful tool when you need to know what appears in an image.
  The input must be a valid url including the protocol.`;

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  public async _call(input: string): Promise<string> {
    try {
      const result = await prediction<string>({
        version: process.env.REPLICATE_IMAGE_TO_TEXT_ID as string,
        input: { image: input },
      });

      if (isNil(result)) {
        return 'No result.';
      }

      return result.trim();
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { ImageToText };
