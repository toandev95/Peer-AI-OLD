/* eslint-disable no-await-in-loop, no-constant-condition */
import { Tool } from 'langchain/tools';
import { includes, isNil, isString } from 'lodash';

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
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: process.env.REPLICATE_IMAGE_TO_TEXT_ID,
          input: { image: input },
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
            if (isString(jsonl.output)) {
              output = (jsonl.output as string).trim();
            }

            break;
          }
        }
      }

      if (!isNil(output)) {
        return output;
      }

      return 'Cannot convert the image to text.';
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { ImageToText };
