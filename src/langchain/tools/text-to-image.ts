import { Tool } from 'langchain/tools';
import { isEmpty, isNil } from 'lodash';
import Replicate from 'replicate';

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
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN as string,
      });

      const output = await replicate.run(
        process.env.REPLICATE_TEXT_TO_IMAGE_ID as any,
        { input: { prompt: input } },
      );

      const results = output as unknown as string[];

      if (!isNil(results) && !isEmpty(results)) {
        return JSON.stringify(results);
      }

      return 'No results were found.';
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { TextToImage };
