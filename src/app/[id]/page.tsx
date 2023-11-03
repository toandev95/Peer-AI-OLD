import { ChatUI } from '@/components/ChatUI';

export default function Page({ params }: { params: { id: string } }) {
  return <ChatUI id={params.id} />;
}
