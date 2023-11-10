import { Tool } from 'langchain/tools';
import { isNil } from 'lodash';

import { prediction } from '@/lib/replicate';

/**
 * A tool that converts text to an image.
 *
 * @author Toan Doan
 */

class TextToImage extends Tool {
  public name: string = 'text-to-image';

  public description: string = `A useful tool when you need to generate images from text prompts.
  The input is prompts content that fully describes what needs to appear in the image.`;

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  public async _call(input: string): Promise<string> {
    try {
      const result = await prediction<string[]>({
        version: process.env.REPLICATE_TEXT_TO_IMAGE_ID as string,
        input: { prompt: input },
      });

      if (isNil(result)) {
        return 'No result.';
      }

      return JSON.stringify(result);
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { TextToImage };
