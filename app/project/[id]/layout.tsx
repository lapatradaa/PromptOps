import { Metadata } from 'next';

interface GenerateMetadataProps {
  params: { id: string };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  return {
    title: `Project ${params.id} | PromptOps`,
    description: 'Optimize & Test prompts for LLM',
    icons: {
      icon: '/icon.png'
    }
  };
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}