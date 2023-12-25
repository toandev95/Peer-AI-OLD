import { Document } from 'langchain/document';
import { StructuredTool } from 'langchain/tools';
import _, { isEmpty, isNil } from 'lodash';
import { z } from 'zod';

/**
 * A tool that uses Google to search for information on the internet.
 *
 * @author Toan Doan
 */

class GoogleSearch extends StructuredTool {
  public schema = z.object({
    query: z.string().describe('A query to search for.'),
  });

  public name: string = 'search';

  public description: string = `A useful online search engine when you need to answer questions about real-time events or recent events on the internet.`;

  constructor(private readonly browserlessUrl: string) {
    super();
  }

  // eslint-disable-next-line no-underscore-dangle
  public async _call({ query }: { query: string }): Promise<string> {
    try {
      const res = await fetch(`${this.browserlessUrl}/function?stealth=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // eslint-disable-next-line no-template-curly-in-string
          code: 'module.exports=async({page:e,context:t})=>{let{query:l}=t;await e.goto(`https://www.google.com/search?q=${l}`,{waitUntil:"networkidle2"});let r=await e.evaluate(()=>{let e=document.querySelector("#center_col").querySelectorAll("div > div[jscontroller][lang], div > div[data-ved][lang]"),t=[];return e.forEach(e=>{let l=e.querySelector("a"),r=e.querySelector("h3"),i=e.querySelector(\'div[style^="-webkit-line-clamp"]\');t.push({url:l.getAttribute("href"),title:r.innerText.trim(),description:i?i.innerText.trim():null})}),t});return{type:"application/json",data:r}};',
          context: { query: encodeURIComponent(query) },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        return 'Something went wrong, please try again.';
      }

      const data = (await res.json()) as {
        url: string;
        title: string;
        description?: string;
      }[];

      if (isNil(data) || isEmpty(data)) {
        return 'No good results found.';
      }

      const docs = _(data)
        .map((item) => {
          return new Document({
            pageContent: JSON.stringify({
              title: item.title,
              description: item.description,
              url: item.url,
            }),
            metadata: { source: item.url },
          });
        })
        .value();

      return _(docs)
        .map((r) => r.pageContent)
        .join('\n');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return (e as Error).toString();
    }
  }
}

export { GoogleSearch };
