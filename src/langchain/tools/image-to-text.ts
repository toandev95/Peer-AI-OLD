import { Tool } from 'langchain/tools';
import { isString } from 'lodash';
import Replicate from 'replicate';

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
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN as string,
      });

      const output = await replicate.run(
        process.env.REPLICATE_IMAGE_TO_TEXT_ID as any,
        { input: { image: input } },
      );

      if (isString(output)) {
        return (output as unknown as string).trim();
      }

      return 'No results were found.';
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { ImageToText };
