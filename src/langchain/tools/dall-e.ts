import { Tool } from 'langchain/tools';
import { isEmpty } from 'lodash';
import OpenAI from 'openai';

/**
 * A tool that converts text to an image.
 *
 * @author Toan Doan
 */

class DallE extends Tool {
  public name: string = 'dall-e';

  public description: string = `A useful tool when you need to generate images from text prompts.
  The input is prompts content that fully describes what needs to appear in the image.`;

  constructor(
    private readonly options: {
      apiKey: string | undefined;
      baseUrl: string | undefined;
    },
  ) {
    super();
  }

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  public async _call(input: string): Promise<string> {
    try {
      const openai = new OpenAI({
        apiKey: this.options.apiKey,
        baseURL: this.options.baseUrl,
      });

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: input,
        n: 1,
        size: '1024x1024',
      });

      if (isEmpty(response.data)) {
        return 'No result.';
      }

      return JSON.stringify(response.data.map((item) => item.url));
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { DallE };
