import type { PutBlobResult } from '@vercel/blob';
import { upload } from '@vercel/blob/client';
import { isNil } from 'lodash';
import type { ChangeEvent, RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';

const useFileUpload = ({
  onUploaded,
  onError,
}: {
  onUploaded: (blob: PutBlobResult) => void;
  onError: (err: Error) => void;
}): {
  ref: RefObject<HTMLInputElement>;
  isUploading: boolean;
  handleFilePicker: () => void;
  handleFileChange: (ev: ChangeEvent<HTMLInputElement>) => void;
} => {
  const ref = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFilePicker = useCallback(() => {
    if (isNil(ref.current)) {
      return;
    }

    ref.current.value = '';
    ref.current.click();
  }, []);

  const handleFileChange = async (ev: ChangeEvent<HTMLInputElement>) => {
    const { files } = ev.currentTarget;

    if (isNil(files) || isNil(files[0])) {
      return;
    }

    setIsUploading(true);

    try {
      if (files[0].size > 5 * 1024 * 1024) {
        throw new Error('File must have a maximum size of 5MB.');
      }

      const blob = await upload(files[0].name, files[0], {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      onUploaded(blob);
    } catch (err) {
      onError(err as unknown as Error);
    } finally {
      setIsUploading(false);
    }
  };

  return { ref, isUploading, handleFilePicker, handleFileChange };
};

export { useFileUpload };
