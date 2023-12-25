import { isNil } from 'lodash';
import type { FC, JSXElementConstructor, ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

type ConfirmDialogProps = {
  isOpen: boolean;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  isProcessingConfirm: boolean;
};

type ConfirmDialogOptions<T extends ConfirmDialogProps> = Omit<
  T,
  'isOpen' | 'onConfirmAction' | 'onCancelAction' | 'isProcessingConfirm'
> & {
  onConfirmAction: () => Promise<void> | void;
  onCancelAction?: () => void;
};

type ConfirmDialogFunction<T extends ConfirmDialogProps> = (
  options: ConfirmDialogOptions<T>,
) => void;

type ConfirmDialogRequest<T extends ConfirmDialogProps> = {
  DialogComponent: JSXElementConstructor<T>;
  options: ConfirmDialogOptions<T>;
};

type RequestConfirmDialog<T extends ConfirmDialogProps> = (
  request: ConfirmDialogRequest<T>,
) => void;

const ConfirmDialogContext =
  createContext<RequestConfirmDialog<ConfirmDialogProps> | null>(null);

const useConfirmDialog = <T extends ConfirmDialogProps>(
  DialogComponent: JSXElementConstructor<T>,
): ConfirmDialogFunction<T> => {
  const context = useContext(
    ConfirmDialogContext,
  ) as RequestConfirmDialog<T> | null;

  if (isNil(context)) {
    throw new Error('Component must be wrapped within ConfirmDialogProvider');
  }

  return useCallback(
    (options: ConfirmDialogOptions<T>) => {
      context({ DialogComponent, options });
    },
    [context, DialogComponent],
  );
};

const ConfirmDialogProvider: FC<{ children?: ReactNode | undefined }> = ({
  children,
}) => {
  const [dialogRequest, setDialogRequest] =
    useState<ConfirmDialogRequest<ConfirmDialogProps> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const requestConfirmDialog = useCallback(
    (request: ConfirmDialogRequest<ConfirmDialogProps>) => {
      setDialogRequest(request);
      setIsOpen(true);
    },
    [],
  );

  const handleCancel = useCallback(() => {
    if (isProcessing) {
      return;
    }

    setIsOpen(false);

    if (!isNil(dialogRequest) && !isNil(dialogRequest.options.onCancelAction)) {
      dialogRequest.options.onCancelAction();
    }
  }, [dialogRequest, isProcessing]);

  const handleConfirm = useCallback(() => {
    setIsProcessing(true);

    (async () => {
      try {
        if (!isNil(dialogRequest)) {
          await dialogRequest.options.onConfirmAction();
        }
      } finally {
        setIsProcessing(false);
        setIsOpen(false);
      }
    })();
  }, [dialogRequest]);

  return (
    <ConfirmDialogContext.Provider value={requestConfirmDialog}>
      {children}
      {dialogRequest && (
        <dialogRequest.DialogComponent
          {...dialogRequest.options}
          isOpen={isOpen}
          onCancelAction={handleCancel}
          onConfirmAction={handleConfirm}
          isProcessingConfirm={isProcessing}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
};

export type { ConfirmDialogProps };
export { ConfirmDialogProvider, useConfirmDialog };
