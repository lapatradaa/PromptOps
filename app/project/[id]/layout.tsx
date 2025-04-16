// @/app/project/[id]/layout.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import styles from './project.module.css';

interface GenerateMetadataProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: GenerateMetadataProps): Promise<Metadata> {
  // Properly await the params object
  const { id } = await params;

  if (!id) {
    return {
      title: 'Project Not Found | PromptOps',
      description: 'The requested project does not exist.',
      icons: { icon: '/icon.png' },
      robots: 'noindex, nofollow',
    };
  }

  try {
    // Validate ObjectId before querying
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      console.error('Invalid ObjectId:', error);
      return {
        title: 'Invalid Project ID | PromptOps',
        description: 'The provided project ID is not valid.',
        icons: { icon: '/icon.png' },
        robots: 'noindex, nofollow',
      };
    }

    const client = await clientPromise;
    const db = client.db('promptops');

    const project = await db.collection('projects').findOne({
      _id: objectId,
    });

    if (!project) {
      return {
        title: 'Project Not Found | PromptOps',
        description: 'The requested project does not exist.',
        icons: { icon: '/icon.png' },
        robots: 'noindex, nofollow',
      };
    }

    const projectName = project.name || 'Untitled Project';
    return {
      title: `Project: ${projectName} | PromptOps`,
      description: `Details and management for ${projectName}. Optimize & Test prompts for LLM.`,
      icons: { icon: '/icon.png' },
      robots: 'noindex, nofollow',
    };
  } catch (error) {
    console.error('Error in generateMetadata:', error);
    return {
      title: 'Error Loading Project | PromptOps',
      description: 'There was an issue fetching the project details.',
      icons: { icon: '/icon.png' },
      robots: 'noindex, nofollow',
    };
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  await params;

  return (
    <div className={styles.layoutContainer}>
      <Suspense
        fallback={
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading project...</p>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}