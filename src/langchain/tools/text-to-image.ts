/* eslint-disable no-await-in-loop, no-constant-condition */
import { Tool } from 'langchain/tools';
import { includes, isEmpty, isNil } from 'lodash';

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
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: process.env.REPLICATE_TEXT_TO_IMAGE_ID,
          input: { prompt: input },
        }),
      });

      const json = await res.json();

      let output;

      if (json.status === 'starting') {
        while (true) {
          await new Promise((resolve) => {
            setTimeout(resolve, 2000);
          });

          const resl = await fetch(
            `https://api.replicate.com/v1/predictions/${json.id}`,
            {
              method: 'post',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              },
              body: JSON.stringify({}),
            },
          );

          const jsonl = await resl.json();

          if (includes(['failed', 'canceled'], jsonl.status)) {
            break;
          }

          if (jsonl.status === 'succeeded') {
            const images = (jsonl.output as unknown as string[]) || [];

            if (!isEmpty(images)) {
              output = images[0] as string;
            }

            break;
          }
        }
      }

      if (!isNil(output)) {
        return output;
      }

      return 'Cannot convert the text to image.';
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { TextToImage };
