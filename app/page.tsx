// app/page.tsx
'use client'
import { useRouter } from 'next/navigation'
import styles from './homepage.module.css'

export default function Home() {
  const router = useRouter()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.iconContainer}>
          <img src="/icons/promptops_icon.svg" alt="PromptOps Icon" />
          <p>PromptOps</p>
        </div>
        <div className={styles.signInSignUpContainer}>
          <button
            className={styles.signUp}
            onClick={() => router.push('/auth')}
          >
            SIGN UP
          </button>
          <button
            className={styles.signIn}
            onClick={() => router.push('/auth')}
          >
            SIGN IN
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.descContainer}>
          <p>Optimizes & Tests prompts for LLM with <span>PromptOps</span></p>
          <button
            className={styles.startButton}
            onClick={() => router.push('/projects')}
          >
            Get Start &gt;
          </button>
        </div>
        <img src='/images/illustration1.svg' alt="Illustration" />
      </main>
      <footer className={styles.footer}></footer>
    </div>
  )
}