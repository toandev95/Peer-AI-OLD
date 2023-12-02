import { SafeSearchType, search } from 'duck-duck-scrape';
import { htmlToText } from 'html-to-text';
import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import { Document } from 'langchain/document';
import type { Embeddings } from 'langchain/embeddings/base';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import _ from 'lodash';

/**
 * A tool that uses DuckDuckGo to search for information on the internet.
 *
 * @author Toan Doan
 */

class DuckDuckGo extends Tool {
  public name: string = 'search';

  public description: string = `A useful online search engine when you need to answer questions about real-time events or recent events on the internet.
  The input should be a search query.`;

  constructor(private readonly embeddings: Embeddings) {
    super();
  }

  // eslint-disable-next-line no-underscore-dangle
  public async _call(
    input: string,
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    try {
      const { noResults, results: searchResults } = await search(input, {
        safeSearch: SafeSearchType.OFF,
      });

      if (noResults) {
        return 'No good results found.';
      }

      const docs = _(searchResults)
        .map((item) => {
          const description = htmlToText(item.description);

          return new Document({
            pageContent: JSON.stringify({
              title: item.title,
              description,
              url: item.url,
            }),
            metadata: { source: item.url },
          });
        })
        .value();

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
        input,
        1,
        undefined,
        runManager?.getChild('vectorstore'),
      );

      return results.map((r) => r.pageContent).join('\n');
    } catch (e) {
      return (e as Error).toString();
    }
  }
}

export { DuckDuckGo };
