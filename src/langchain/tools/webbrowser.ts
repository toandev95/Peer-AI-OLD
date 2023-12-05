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
    private readonly browserUrl: string,
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
        `${this.browserUrl}/function?stealth=true&ignoreHTTPSErrors=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'module.exports=async({page:t,context:a})=>{let{url:e}=a;await t.goto(e,{waitUntil:"networkidle2"});let i=await t.evaluate(()=>document.body.innerText);return{type:"text/plain",data:i}};',
            context: { url },
          }),
          redirect: 'follow',
        },
      );

      const rawText = await res.text();

      const docs: Document[] = [
        new Document({
          pageContent: rawText,
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
        4,
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
