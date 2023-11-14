import { useTranslation } from 'react-i18next';

import type { ConfirmDialogProps } from '../Providers/ConfirmDialogProvider';
import { Button } from './Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog';

const ConfirmDialog = ({
  message,
  ...props
}: ConfirmDialogProps & {
  message: string;
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onCancelAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirm.title')}</DialogTitle>
        </DialogHeader>
        <div>{message}</div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={props.onCancelAction}
          >
            {t('confirm.actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={props.onConfirmAction}
          >
            {t('confirm.actions.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ConfirmDialog };
