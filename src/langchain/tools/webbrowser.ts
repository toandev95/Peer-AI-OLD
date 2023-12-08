import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import { Document } from 'langchain/document';
import type { Embeddings } from 'langchain/embeddings/base';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import _, { isEmpty } from 'lodash';

/**
 * A tool that uses a web browser to search for information on the internet.
 *
 * @author Toan Doan
 */

class WebBrowser extends Tool {
  public name: string = 'web-browser';

  public description: string = `A portal to the internet. Use this when you need to find something on or summarize a webpage.
  The input MUST be a comma-separated list of: "a valid URL including protocol", "what you want to find on the page or empty string for a summary".`;

  constructor(
    private readonly embeddings: Embeddings,
    private readonly browserlessUrl: string,
  ) {
    super();
  }

  // eslint-disable-next-line no-underscore-dangle, class-methods-use-this
  public async _call(
    input: string,
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    try {
      const inputs = _(input)
        .split(',')
        .map((s) => (!isEmpty(s.trim()) ? s.trim() : undefined))
        .value();

      const url = inputs[0] as string;

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
        inputs[1] || 'a summary',
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
