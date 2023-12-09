import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import { Document } from 'langchain/document';
import type { Embeddings } from 'langchain/embeddings/base';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { StructuredTool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { z } from 'zod';

/**
 * A tool that uses a web browser to search for information on the internet.
 *
 * @author Toan Doan
 */

class WebBrowser extends StructuredTool {
  public schema = z.object({
    url: z
      .string()
      .url()
      .describe('A valid URL including protocol. Eg: http(s)://domain.com/abc'),
    task: z
      .string()
      .default('summary')
      .describe('A task to perform on the webpage.'),
  });

  public name: string = 'web-browser';

  public description: string = `A portal to the internet.
  Use this when you need to find something on or summarize a webpage.`;

  constructor(
    private readonly embeddings: Embeddings,
    private readonly browserlessUrl: string,
  ) {
    super();
  }

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  public async _call(
    { url, task }: { url: string; task: string },
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    try {
      const res = await fetch(
        `${this.browserlessUrl}/scrape?stealth=true&ignoreHTTPSErrors=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            elements: [{ selector: 'body' }],
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!res.ok) {
        return 'Something went wrong, please try again.';
      }

      const { data } = (await res.json()) as {
        data: { results: { text: string }[] }[];
      };

      if (data.length === 0 || data[0]!.results.length === 0) {
        return 'No data found.';
      }

      const docs: Document[] = [
        new Document({
          pageContent: data[0]!.results[0]!.text,
          metadata: { source: url },
        }),
      ];

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 300,
        chunkOverlap: 0,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);

      const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        this.embeddings,
      );

      const results = await vectorStore.similaritySearch(
        task,
        undefined,
        undefined,
        runManager?.getChild('vectorstore'),
      );

      return results.map((r) => r.pageContent).join('\n');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return (e as Error).toString();
    }
  }
}

export { WebBrowser };
