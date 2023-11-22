/* eslint-disable no-await-in-loop */

import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import { Document } from 'langchain/document';
import type { Embeddings } from 'langchain/embeddings/base';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import _, { isEmpty, isNil } from 'lodash';
import { getDocument, version } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

/**
 * A tool that uses PDF.js to read data from PDF files.
 *
 * @author Toan Doan
 */

class PDFReader extends Tool {
  public name: string = 'pdf';

  public description: string = `A useful tool when you are asked to read data from a PDF file that they have uploaded to the system via a specific URL.
  The input MUST be a comma-separated list of: "a valid URL including protocol", "what to find in the PDF or summarize".`;

  constructor(private readonly embeddings: Embeddings) {
    super();

    this.loadImports();
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadImports(): Promise<void> {
    const pdfjs = await import('pdfjs-dist/build/pdf');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }

  // eslint-disable-next-line class-methods-use-this
  private async getDocs(url: string): Promise<Document<Record<string, any>>[]> {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    const arrayBuffer = await res.arrayBuffer();

    const parsedPdf = await getDocument(new Uint8Array(arrayBuffer)).promise;
    const meta = await parsedPdf.getMetadata().catch(() => null);

    const docs: Document[] = [];

    for (let i = 1; i <= parsedPdf.numPages; i += 1) {
      const page = await parsedPdf.getPage(i);
      const content = await page.getTextContent();

      if (content.items.length > 0) {
        const text = _(content.items)
          .map((item) => (item as TextItem).str)
          .join('\n');

        docs.push(
          new Document({
            pageContent: text,
            metadata: {
              pdf: {
                version,
                ...(!isNil(meta)
                  ? {
                      info: meta.info,
                      metadata: meta.metadata,
                    }
                  : {}),
                totalPages: parsedPdf.numPages,
              },
              loc: { pageNumber: i },
            },
          }),
        );
      }
    }

    return docs;
  }

  // eslint-disable-next-line no-underscore-dangle
  public async _call(
    input: string,
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    try {
      const inputs = _(input)
        .split(',')
        .map((s) => (!isEmpty(s.trim()) ? s.trim() : undefined))
        .value();

      const docs = await this.getDocs(inputs[0] as string);

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
      return (e as Error).toString();
    }
  }
}

export { PDFReader };
